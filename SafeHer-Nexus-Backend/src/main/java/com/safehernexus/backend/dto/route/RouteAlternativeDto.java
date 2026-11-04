package com.safehernexus.backend.dto.route;

import java.util.List;

public record RouteAlternativeDto(
        String routeId,
        String summary,
        boolean recommended,
        String recommendationReason,
        double distanceMeters,
        double durationSeconds,
        String distanceFormatted,
        String durationFormatted,
        List<String> safetyPrecautions,
        List<RouteStepDto> steps,
        String googleMapsNavigationUrl
) {}
