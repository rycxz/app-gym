package com.programa.rutina.controllers;

import java.io.Serializable;

/** Identidad guardada en la sesión HTTP. */
public record Sesion(Long id, String email) implements Serializable {
}
