package com.programa.rutina.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain seguridad(HttpSecurity http, SecurityContextRepository contexto) throws Exception {
        // La cookie XSRF-TOKEN la lee la app y la devuelve en la cabecera X-XSRF-TOKEN.
        CsrfTokenRequestAttributeHandler csrf = new CsrfTokenRequestAttributeHandler();
        csrf.setCsrfRequestAttributeName(null);
        return http
            .csrf(c -> c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()).csrfTokenRequestHandler(csrf))
            .securityContext(s -> s.securityContextRepository(contexto))
            .requestCache(r -> r.disable())
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/**", "/api/me").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .logout(l -> l.logoutUrl("/api/auth/logout").logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
            .build();
    }

    @Bean
    SecurityContextRepository contexto() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    PasswordEncoder encoder() {
        return new BCryptPasswordEncoder();
    }

    /** El login es propio (AuthController); esto evita el usuario por defecto de Spring. */
    @Bean
    UserDetailsService sinUsuariosPorDefecto() {
        return u -> { throw new UsernameNotFoundException(u); };
    }
}
