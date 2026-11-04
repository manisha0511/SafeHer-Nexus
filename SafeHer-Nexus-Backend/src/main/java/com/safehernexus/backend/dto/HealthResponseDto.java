package com.safehernexus.backend.dto;

import java.time.Instant;

public record HealthResponseDto(
        String status,
        String service,
        String version,
        Instant timestamp
) {
}
