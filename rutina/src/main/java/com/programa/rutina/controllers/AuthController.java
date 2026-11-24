package com.programa.rutina.controllers;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.programa.rutina.models.Cuenta;
import com.programa.rutina.service.CuentaService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {
    public record Credenciales(@NotBlank @Email @Size(max = 200) String email, @NotBlank @Size(min = 8, max = 72) String password) {}
    public record ConCodigo(@NotBlank @Email @Size(max = 200) String email, @NotBlank @Size(min = 8, max = 72) String password, @NotBlank @Pattern(regexp = "\\d{6}") String codigo) {}
    public record Correo(@NotBlank @Email @Size(max = 200) String email) {}

    private final CuentaService cuentas;
    private final SecurityContextRepository contexto;

    @GetMapping("/me")
    public Map<String, Object> yo(@AuthenticationPrincipal Sesion s, org.springframework.security.web.csrf.CsrfToken csrf) {
        csrf.getToken(); // fuerza que se envíe la cookie XSRF-TOKEN
        Map<String, Object> r = new java.util.HashMap<>();
        r.put("usuario", s == null ? null : Map.of("email", s.email()));
        return r;
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void registrar(@Valid @RequestBody Credenciales d) {
        cuentas.registrar(d.email(), d.password());
    }

    @PostMapping("/auth/verify")
    public ResponseEntity<?> verificar(@Valid @RequestBody ConCodigo d, HttpServletRequest req, HttpServletResponse res) {
        Optional<Cuenta> c = cuentas.verificar(d.email(), d.password(), d.codigo());
        if (c.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Código incorrecto o caducado"));
        return iniciar(c.get(), req, res);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> entrar(@Valid @RequestBody Credenciales d, HttpServletRequest req, HttpServletResponse res) {
        Optional<Cuenta> c = cuentas.entrar(d.email(), d.password());
        if (c.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Correo o contraseña incorrectos"));
        return iniciar(c.get(), req, res);
    }

    @PostMapping("/auth/forgot")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void olvidada(@Valid @RequestBody Correo d) {
        cuentas.olvidada(d.email());
    }

    @PostMapping("/auth/reset")
    public ResponseEntity<?> cambiar(@Valid @RequestBody ConCodigo d) {
        if (!cuentas.cambiar(d.email(), d.password(), d.codigo())) return ResponseEntity.badRequest().body(Map.of("error", "Código incorrecto o caducado"));
        return ResponseEntity.ok(Map.of());
    }

    private ResponseEntity<?> iniciar(Cuenta c, HttpServletRequest req, HttpServletResponse res) {
        if (req.getSession(false) != null) req.changeSessionId(); // contra fijación de sesión
        SecurityContext sc = SecurityContextHolder.createEmptyContext();
        sc.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(new Sesion(c.getId(), c.getEmail()), null, List.of()));
        SecurityContextHolder.setContext(sc);
        contexto.saveContext(sc, req, res);
        return ResponseEntity.ok(Map.of("email", c.getEmail()));
    }
}
