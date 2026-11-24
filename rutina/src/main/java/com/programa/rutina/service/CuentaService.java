package com.programa.rutina.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.programa.rutina.models.Cuenta;
import com.programa.rutina.repository.CuentaRepository;

@Service
public class CuentaService {
    private static final Duration VALIDEZ = Duration.ofMinutes(15);
    private static final int MAX_INTENTOS = 5;

    private final SecureRandom azar = new SecureRandom();
    private final CuentaRepository cuentas;
    private final PasswordEncoder encoder;
    private final CorreoService correo;
    private final String hashFalso;

    public CuentaService(CuentaRepository cuentas, PasswordEncoder encoder, CorreoService correo) {
        this.cuentas = cuentas;
        this.encoder = encoder;
        this.correo = correo;
        this.hashFalso = encoder.encode("sin-cuenta");
    }

    private static String normal(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** Si el correo ya tiene cuenta no hace nada, para no revelar quién está registrado. */
    @Transactional
    public void registrar(String email, String password) {
        Cuenta c = cuentas.findWithLockByEmail(normal(email)).orElseGet(Cuenta::new);
        String hash = encoder.encode(password);
        if (c.isVerificada() || codigoReciente(c)) return;
        c.setEmail(normal(email));
        c.setPasswordHash(hash);
        enviarCodigo(c);
    }

    @Transactional
    public Optional<Cuenta> verificar(String email, String password, String codigo) {
        Optional<Cuenta> c = cuentas.findWithLockByEmail(normal(email)).filter(x -> !x.isVerificada());
        if (c.isEmpty() || !codigoValido(c.get(), codigo) || !encoder.matches(password, c.get().getPasswordHash())) return Optional.empty();
        c.get().setVerificada(true);
        c.get().setCodigoHash(null);
        return c;
    }

    @Transactional
    public Optional<Cuenta> entrar(String email, String password) {
        Cuenta c = cuentas.findWithLockByEmail(normal(email)).orElse(null);
        boolean ok = encoder.matches(password, c == null ? hashFalso : c.getPasswordHash());
        if (c == null || !c.isVerificada()) return Optional.empty();
        if (c.getBloqueadaHasta() != null && c.getBloqueadaHasta().isAfter(Instant.now())) return Optional.empty();
        if (!ok) {
            c.setLoginFallos(c.getLoginFallos() + 1);
            if (c.getLoginFallos() >= MAX_INTENTOS) {
                c.setBloqueadaHasta(Instant.now().plus(VALIDEZ));
                c.setLoginFallos(0);
            }
            return Optional.empty();
        }
        c.setLoginFallos(0);
        c.setBloqueadaHasta(null);
        return Optional.of(c);
    }

    @Transactional
    public void olvidada(String email) {
        cuentas.findWithLockByEmail(normal(email)).filter(c -> c.isVerificada() && !codigoReciente(c)).ifPresent(this::enviarCodigo);
    }

    @Transactional
    public boolean cambiar(String email, String password, String codigo) {
        Optional<Cuenta> c = cuentas.findWithLockByEmail(normal(email)).filter(Cuenta::isVerificada);
        if (c.isEmpty() || !codigoValido(c.get(), codigo)) return false;
        c.get().setPasswordHash(encoder.encode(password));
        c.get().setCodigoHash(null);
        c.get().setBloqueadaHasta(null);
        c.get().setLoginFallos(0);
        return true;
    }

    /** Como mucho un código por minuto y cuenta: evita usar el servidor para enviar spam. */
    private boolean codigoReciente(Cuenta c) {
        return c.getCodigoHash() != null && c.getCodigoExpira().minus(VALIDEZ).plusSeconds(60).isAfter(Instant.now());
    }

    private void enviarCodigo(Cuenta c) {
        String codigo = String.format("%06d", azar.nextInt(1_000_000));
        c.setCodigoHash(encoder.encode(codigo));
        c.setCodigoExpira(Instant.now().plus(VALIDEZ));
        c.setCodigoIntentos(0);
        cuentas.save(c);
        correo.enviarCodigo(c.getEmail(), codigo);
    }

    private boolean codigoValido(Cuenta c, String codigo) {
        if (c.getCodigoHash() == null || c.getCodigoExpira().isBefore(Instant.now()) || c.getCodigoIntentos() >= MAX_INTENTOS) return false;
        c.setCodigoIntentos(c.getCodigoIntentos() + 1);
        return encoder.matches(codigo, c.getCodigoHash());
    }
}
