# RutinaGym

Cuaderno de gimnasio para Android y iPhone. Sustituye al bloc de notas: montas tu rutina, la app te dice qué toca hoy, apuntas pesos y repeticiones y ves cómo progresas. Funciona sin conexión.

## Qué hace

- Convierte el texto de tu bloc de notas en una rutina, o empieza desde una plantilla.
- Muestra el entreno de hoy y los próximos.
- Enseña lo que hiciste la última vez y lo rellena con un toque.
- Temporizador de descanso, RIR, notas, récords y 1RM estimado.
- Gráficas por ejercicio e historial editable.
- Comparte rutinas con un código por WhatsApp.
- Copias de seguridad en un archivo.

## Instalar

**iPhone:** abre la web en Safari, pulsa Compartir y «Añadir a pantalla de inicio».

**Android:** abre la web en Chrome y elige «Instalar aplicación», o instala el APK.

La web se publica sola en GitHub Pages con cada push a `main`. Actívalo una vez en Settings > Pages > Source: GitHub Actions.

Los datos se guardan en cada móvil. Usa Ajustes > Guardar copia antes de cambiar de móvil o desinstalar. El APK y la web no comparten datos: elige una de las dos.

## Desarrollo

| Qué | Cómo |
| --- | --- |
| Ver la app | `cd app && npm start` |
| Probar la lógica | `cd app && npm test` |
| Prueba en navegador | instrucciones al inicio de `app/test/e2e.mjs` |
| APK | `cd app && npm ci && npx cap sync android && cd android && ./gradlew assembleRelease` |
| iOS nativo (Mac con Xcode) | `cd app && npm ci && npx cap sync ios && npx cap open ios` |

El APK se firma con la clave de depuración del ordenador que lo genera. Para instalar una versión nueva encima hay que generarla en el mismo ordenador.

Al publicar cambios en `app/www`, sube `VERSION` en `app/www/sw.js`.

## Servidor opcional

`rutina/` es un servidor Spring Boot (Java 17) que sirve la app. No tiene cuentas ni base de datos: los datos se quedan en cada móvil. Con GitHub Pages basta; esto es por si quieres desplegarla en tu servidor o en Google Cloud Run.

```sh
cd rutina
./mvnw spring-boot:run   # http://localhost:8080
./mvnw test
```

Con Docker, desde la raíz: `docker build -f rutina/Dockerfile -t rutinagym .` y `docker run -p 8080:8080 rutinagym`. Para instalarla en el móvil hace falta HTTPS.
