package com.programa.rutina.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Copia en la nube de una cuenta: el JSON que genera la app, con número de versión. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "copias")
public class CopiaDatos {
    @Id
    private Long cuentaId;
    private long version;
    @Column(nullable = false, length = 16_000_000)
    private String json;
}
