package com.safehernexus.backend.controller;

import com.safehernexus.backend.dto.HealthResponseDto;
import com.safehernexus.backend.service.HealthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping({"/v1/health", "/health"})
    public ResponseEntity<HealthResponseDto> checkHealth() {
        return ResponseEntity.ok(healthService.getHealthStatus());
    }
}
