package com.programa.rutina;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.programa.rutina.repository.CuentaRepository;
import com.programa.rutina.service.CorreoService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class ApiTests {
    @Autowired MockMvc mvc;
    @Autowired CuentaRepository cuentas;
    @MockitoBean CorreoService correo;

    String email;

    @BeforeEach
    void nuevoCorreo() {
        email = UUID.randomUUID() + "@test.es";
    }

    ResultActions enviar(String ruta, String json, MockHttpSession s) throws Exception {
        return mvc.perform(post("/api/auth/" + ruta).session(s).with(csrf()).contentType("application/json").content(json));
    }

    String cred(String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    String conCodigo(String password, String codigo) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"codigo\":\"" + codigo + "\"}";
    }

    String ultimoCodigo() {
        ArgumentCaptor<String> c = ArgumentCaptor.forClass(String.class);
        verify(correo, atLeastOnce()).enviarCodigo(eq(email), c.capture());
        return c.getValue();
    }

    MockHttpSession cuentaLista() throws Exception {
        MockHttpSession s = new MockHttpSession();
        enviar("register", cred("secreta123"), s).andExpect(status().isAccepted());
        enviar("verify", conCodigo("secreta123", ultimoCodigo()), s).andExpect(status().isOk());
        return s;
    }

    @Test
    void sinSesionMeEsNuloYSyncEsta401() throws Exception {
        mvc.perform(get("/api/me")).andExpect(status().isOk()).andExpect(jsonPath("$.usuario").isEmpty());
        mvc.perform(get("/api/sync")).andExpect(status().isUnauthorized());
    }

    @Test
    void sinCsrfSeRechaza() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json").content(cred("secreta123"))).andExpect(status().isForbidden());
    }

    @Test
    void registroVerificadoIniciaSesion() throws Exception {
        MockHttpSession s = cuentaLista();
        mvc.perform(get("/api/me").session(s)).andExpect(jsonPath("$.usuario.email").value(email));
        assertThat(cuentas.findByEmail(email).orElseThrow().getPasswordHash()).doesNotContain("secreta123");
    }

    @Test
    void sinVerificarNoSePuedeEntrar() throws Exception {
        enviar("register", cred("secreta123"), new MockHttpSession());
        enviar("login", cred("secreta123"), new MockHttpSession()).andExpect(status().isUnauthorized());
    }

    @Test
    void codigoMaloSeBloqueaTrasCincoIntentos() throws Exception {
        MockHttpSession s = new MockHttpSession();
        enviar("register", cred("secreta123"), s);
        String bueno = ultimoCodigo(), malo = bueno.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 5; i++) enviar("verify", conCodigo("secreta123", malo), s).andExpect(status().isBadRequest());
        enviar("verify", conCodigo("secreta123", bueno), s).andExpect(status().isBadRequest());
    }

    @Test
    void verificarExigeLaContrasenaDelRegistro() throws Exception {
        MockHttpSession s = new MockHttpSession();
        enviar("register", cred("secreta123"), s);
        enviar("verify", conCodigo("otra-clave1", ultimoCodigo()), s).andExpect(status().isBadRequest());
    }

    @Test
    void registrarUnCorreoExistenteNoLoPisaNiLoDelata() throws Exception {
        cuentaLista();
        org.mockito.Mockito.clearInvocations(correo);
        enviar("register", cred("atacante123"), new MockHttpSession()).andExpect(status().isAccepted());
        verify(correo, never()).enviarCodigo(any(), any());
        enviar("login", cred("secreta123"), new MockHttpSession()).andExpect(status().isOk());
        enviar("login", cred("atacante123"), new MockHttpSession()).andExpect(status().isUnauthorized());
    }

    @Test
    void loginSeBloqueaTrasMuchosFallos() throws Exception {
        cuentaLista();
        for (int i = 0; i < 5; i++) enviar("login", cred("mala-mala"), new MockHttpSession()).andExpect(status().isUnauthorized());
        enviar("login", cred("secreta123"), new MockHttpSession()).andExpect(status().isUnauthorized());
    }

    @Test
    void datosInvalidosDan400() throws Exception {
        enviar("register", "{\"email\":\"nope\",\"password\":\"secreta123\"}", new MockHttpSession()).andExpect(status().isBadRequest());
        enviar("register", cred("corta"), new MockHttpSession()).andExpect(status().isBadRequest());
    }

    @Test
    void recuperarContrasena() throws Exception {
        cuentaLista();
        MockHttpSession s = new MockHttpSession();
        enviar("forgot", "{\"email\":\"" + email + "\"}", s).andExpect(status().isAccepted());
        enviar("reset", conCodigo("nueva-clave1", ultimoCodigo()), s).andExpect(status().isOk());
        enviar("login", cred("secreta123"), new MockHttpSession()).andExpect(status().isUnauthorized());
        enviar("login", cred("nueva-clave1"), new MockHttpSession()).andExpect(status().isOk());
    }

    @Test
    void cerrarSesion() throws Exception {
        MockHttpSession s = cuentaLista();
        enviar("logout", "", s).andExpect(status().isNoContent());
        assertThat(s.isInvalid()).isTrue();
    }

    @Test
    void syncGuardaYDetectaConflictos() throws Exception {
        MockHttpSession s = cuentaLista();
        mvc.perform(get("/api/sync").session(s)).andExpect(jsonPath("$.version").value(0)).andExpect(jsonPath("$.datos").isEmpty());
        String cuerpo = "{\"version\":0,\"datos\":{\"v\":1,\"routines\":[]}}";
        mvc.perform(put("/api/sync").session(s).with(csrf()).contentType("application/json").content(cuerpo)).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(put("/api/sync").session(s).with(csrf()).contentType("application/json").content(cuerpo)).andExpect(status().isConflict());
        mvc.perform(get("/api/sync").session(s)).andExpect(jsonPath("$.datos.v").value(1));
    }

    @Test
    void cadaUnoVeSoloLoSuyo() throws Exception {
        MockHttpSession a = cuentaLista();
        mvc.perform(put("/api/sync").session(a).with(csrf()).contentType("application/json").content("{\"version\":0,\"datos\":{\"v\":1}}")).andExpect(status().isOk());
        nuevoCorreo();
        mvc.perform(get("/api/sync").session(cuentaLista())).andExpect(jsonPath("$.datos").isEmpty());
    }

    @Test
    void sirveLaAppMovil() throws Exception {
        mvc.perform(get("/index.html")).andExpect(status().isOk());
        mvc.perform(get("/js/app.js")).andExpect(status().isOk());
    }
}
