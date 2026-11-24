package com.programa.rutina.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.programa.rutina.models.CopiaDatos;
import com.programa.rutina.repository.CopiaRepository;
import com.programa.rutina.repository.CuentaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CopiaService {
    private final CopiaRepository copias;
    private final CuentaRepository cuentas;

    @Transactional(readOnly = true)
    public Optional<CopiaDatos> leer(Long cuentaId) {
        return copias.findById(cuentaId);
    }

    /** Guarda solo si nadie ha escrito desde que el móvil leyó; vacío si hay conflicto. */
    @Transactional
    public Optional<Long> guardar(Long cuentaId, long version, String json) {
        cuentas.findWithLockById(cuentaId).orElseThrow();
        CopiaDatos c = copias.findById(cuentaId).orElseGet(() -> {
            CopiaDatos n = new CopiaDatos();
            n.setCuentaId(cuentaId);
            return n;
        });
        if (c.getVersion() != version) return Optional.empty();
        c.setVersion(version + 1);
        c.setJson(json);
        copias.save(c);
        return Optional.of(c.getVersion());
    }
}
