# Se construye desde la raíz del repo: docker build -f rutina/Dockerfile -t rutinagym .
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY rutina/pom.xml rutina/pom.xml
RUN mvn -q -f rutina/pom.xml dependency:go-offline
COPY rutina/src rutina/src
COPY app/www app/www
RUN mvn -q -f rutina/pom.xml package -DskipTests

FROM eclipse-temurin:17-jre
RUN useradd -r app
USER app
COPY --from=build /src/rutina/target/rutina-*.jar /app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
