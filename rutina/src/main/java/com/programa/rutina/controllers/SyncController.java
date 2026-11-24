package com.programa.rutina.controllers;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.programa.rutina.models.CopiaDatos;
import com.programa.rutina.service.CopiaService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {
    private static final int MAX = 5_000_000;

    public record Envio(long version, JsonNode datos) {}

    private final CopiaService copias;
    private final ObjectMapper json;

    @GetMapping
    public Map<String, Object> leer(@AuthenticationPrincipal Sesion s) throws JsonProcessingException {
        Optional<CopiaDatos> c = copias.leer(s.id());
        Map<String, Object> r = new HashMap<>();
        r.put("version", c.map(CopiaDatos::getVersion).orElse(0L));
        r.put("datos", c.isPresent() ? json.readTree(c.get().getJson()) : null);
        return r;
    }

    @PutMapping
    public ResponseEntity<?> guardar(@AuthenticationPrincipal Sesion s, @RequestBody Envio e) throws JsonProcessingException {
        if (e.datos() == null || !e.datos().isObject()) return ResponseEntity.badRequest().body(Map.of("error", "Datos no válidos"));
        String texto = json.writeValueAsString(e.datos());
        if (texto.length() > MAX) return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of("error", "La copia es demasiado grande"));
        Optional<Long> v = copias.guardar(s.id(), e.version(), texto);
        return v.isPresent() ? ResponseEntity.ok(Map.of("version", v.get())) : ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Hay una versión más nueva"));
    }
}
