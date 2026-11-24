package com.programa.rutina.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import com.programa.rutina.models.Cuenta;

import jakarta.persistence.LockModeType;

public interface CuentaRepository extends JpaRepository<Cuenta, Long> {
    Optional<Cuenta> findByEmail(String email);

    /** Bloquea la fila para que los intentos simultáneos se cuenten todos. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Cuenta> findWithLockByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Cuenta> findWithLockById(Long id);
}
