package com.safehernexus.backend.service;

import com.safehernexus.backend.dto.HealthResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class HealthService {

    private final String serviceName;
    private final String appVersion;

    public HealthService(
            @Value("${spring.application.name:safeher-nexus-backend}") String serviceName,
            @Value("${app.version:0.2.0}") String appVersion
    ) {
        this.serviceName = serviceName;
        this.appVersion = appVersion;
    }

    public HealthResponseDto getHealthStatus() {
        return new HealthResponseDto(
                "UP",
                serviceName,
                appVersion,
                Instant.now()
        );
    }
}
