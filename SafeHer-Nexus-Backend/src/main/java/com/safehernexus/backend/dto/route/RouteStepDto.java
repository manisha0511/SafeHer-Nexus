package com.safehernexus.backend.dto.route;

public record RouteStepDto(
        String instruction,
        double distanceMeters,
        double durationSeconds,
        String roadName,
        String safetyNote
) {}
