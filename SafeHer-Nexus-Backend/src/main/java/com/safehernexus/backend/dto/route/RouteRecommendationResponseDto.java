package com.safehernexus.backend.dto.route;

import java.util.List;
import java.util.Map;

public record RouteRecommendationResponseDto(
        String origin,
        String destination,
        String travelMode,
        String provider,
        List<RouteAlternativeDto> routes,
        String disclaimer,
        Map<String, String> emergencyHelplines
) {
    public static final String STANDARD_DISCLAIMER =
            "Route recommendations prioritize well-trafficked major arterial roads and transit corridors. " +
            "SafeHer does not guarantee absolute safety, road conditions, or real-time police presence. " +
            "Always remain vigilant, stay aware of surroundings, and call 112 immediately in case of emergency.";

    public static final Map<String, String> STANDARD_HELPLINES = Map.of(
            "National Emergency", "112",
            "Women Helpline (All India)", "1091",
            "Women in Distress", "181",
            "Cyber Crime Helpline", "1930"
    );
}
