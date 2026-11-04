# ==============================================================================
# SafeHer Nexus Backend - Production Multi-Stage Dockerfile
# Base Image: Eclipse Temurin Java 21 (Alpine Linux)
# ==============================================================================

# Stage 1: Build JAR package
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Copy Maven wrapper & POM first for layer caching
COPY pom.xml .
COPY src ./src

# Ensure Maven is present in the container
RUN apk add --no-cache maven && \
    mvn clean package -DskipTests

# Stage 2: Minimal, Secure Runtime Image
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Create unprivileged system group and user
RUN addgroup -S safeher && adduser -S safeher -G safeher

# Copy compiled JAR from builder stage
COPY --from=builder /workspace/target/safeher-nexus-backend-*.jar app.jar

# Install curl for container health check
RUN apk add --no-cache curl

# Use non-root user
USER safeher:safeher

# Expose HTTP port
EXPOSE 8080

# Configure container-aware JVM flags
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Native Docker Healthcheck against SafeHer health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
