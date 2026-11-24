package com.programa.rutina.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.programa.rutina.models.CopiaDatos;

public interface CopiaRepository extends JpaRepository<CopiaDatos, Long> {
}
