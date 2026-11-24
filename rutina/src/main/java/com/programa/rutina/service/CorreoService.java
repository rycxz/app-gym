package com.programa.rutina.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CorreoService {
    private static final Logger log = LoggerFactory.getLogger(CorreoService.class);
    private final JavaMailSender mailSender;
    private final Environment env;

    public void enviarCodigo(String destinatario, String codigo) {
        if (env.acceptsProfiles(Profiles.of("dev"))) {
            log.info("[dev] Código para {}: {}", destinatario, codigo);
            return;
        }
        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setTo(destinatario);
        mensaje.setSubject("Tu código de RutinaGym");
        mensaje.setText("Tu código es " + codigo + ". Caduca en 15 minutos.\n\nSi no lo has pedido tú, ignora este correo.");
        mailSender.send(mensaje);
    }
}
