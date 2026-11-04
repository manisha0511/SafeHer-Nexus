package com.safehernexus.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.config.RouteProperties;
import com.safehernexus.backend.dto.route.RouteAlternativeDto;
import com.safehernexus.backend.dto.route.RouteRecommendationRequestDto;
import com.safehernexus.backend.dto.route.RouteRecommendationResponseDto;
import com.safehernexus.backend.dto.route.RouteStepDto;
import com.safehernexus.backend.exception.BusinessRuleViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Service
public class RouteService {

    private static final Logger log = LoggerFactory.getLogger(RouteService.class);

    private final RouteProperties routeProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    private static final List<String> STANDARD_PRECAUTIONS = List.of(
            "Share your journey details and live location with a trusted contact before starting.",
            "Prioritize wide, well-lit arterial streets and designated transit stops.",
            "Avoid poorly lit shortcuts, isolated parks, or empty alleyways after dark.",
            "Keep your phone charged, accessible, and the SafeHer SOS trigger ready.",
            "If you suspect someone is following you, enter an open public store or petrol station immediately and dial 112."
    );

    @Autowired
    public RouteService(RouteProperties routeProperties, ObjectMapper objectMapper) {
        this.routeProperties = routeProperties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(routeProperties.getTimeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(routeProperties.getTimeoutMs()));

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    public RouteService(RouteProperties routeProperties, ObjectMapper objectMapper, RestClient restClient) {
        this.routeProperties = routeProperties;
        this.objectMapper = objectMapper;
        this.restClient = restClient;
    }

    public RouteRecommendationResponseDto getRouteRecommendations(RouteRecommendationRequestDto request) {
        if (request == null || request.destination() == null || request.destination().isBlank()) {
            throw new BusinessRuleViolationException("Destination is required for route recommendations");
        }

        String originLabel = (request.origin() != null && !request.origin().isBlank())
                ? request.origin().trim()
                : (request.hasOriginCoordinates() ? String.format(Locale.US, "%.5f, %.5f", request.originLat(), request.originLng()) : "Current Location");

        String destinationLabel = request.destination().trim();
        String travelMode = (request.travelMode() != null && !request.travelMode().isBlank())
                ? request.travelMode().toUpperCase(Locale.ROOT)
                : "DRIVING";

        // If both origin and destination have GPS coordinates, attempt real routing engine
        if (request.hasFullCoordinates()) {
            try {
                if ("google".equalsIgnoreCase(routeProperties.getProvider()) && routeProperties.getGoogleApiKey() != null && !routeProperties.getGoogleApiKey().isBlank()) {
                    return callGoogleDirections(originLabel, destinationLabel, request, travelMode);
                } else {
                    return callOsrmRouting(originLabel, destinationLabel, request, travelMode);
                }
            } catch (Exception ex) {
                log.warn("Routing engine call failed ({}), falling back to geometric corridor estimation: {}",
                        routeProperties.getProvider(), ex.getMessage());
                return buildGeometricCorridorFallback(originLabel, destinationLabel, request, travelMode);
            }
        }

        // If coordinates not fully provided, return structured navigation link with standard precautions
        return buildAddressBasedRecommendation(originLabel, destinationLabel, travelMode);
    }

    private RouteRecommendationResponseDto callOsrmRouting(
            String originLabel,
            String destinationLabel,
            RouteRecommendationRequestDto request,
            String travelMode
    ) {
        String profile = switch (travelMode) {
            case "WALKING" -> "walking";
            case "TRANSIT", "DRIVING" -> "driving";
            default -> "driving";
        };

        String url = String.format(
                Locale.US,
                "%s/route/v1/%s/%.6f,%.6f;%.6f,%.6f?overview=false&steps=true&alternatives=true",
                routeProperties.getOsrmBaseUrl().replaceAll("/+$", ""),
                profile,
                request.originLng(),
                request.originLat(),
                request.destinationLng(),
                request.destinationLat()
        );

        log.info("Requesting OSRM route: {}", url);

        String jsonResponse = restClient.get()
                .uri(url)
                .retrieve()
                .body(String.class);

        if (jsonResponse == null || jsonResponse.isBlank()) {
            throw new IllegalStateException("Empty response from OSRM service");
        }

        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            String code = root.path("code").asText("");
            if (!"Ok".equalsIgnoreCase(code)) {
                throw new IllegalStateException("OSRM returned status code: " + code);
            }

            JsonNode routesNode = root.path("routes");
            if (!routesNode.isArray() || routesNode.isEmpty()) {
                throw new IllegalStateException("No routes found in OSRM response");
            }

            List<RouteAlternativeDto> alternatives = new ArrayList<>();
            for (int i = 0; i < routesNode.size(); i++) {
                JsonNode routeNode = routesNode.get(i);
                double distanceMeters = routeNode.path("distance").asDouble(0.0);
                double durationSeconds = routeNode.path("duration").asDouble(0.0);

                List<RouteStepDto> steps = new ArrayList<>();
                JsonNode legs = routeNode.path("legs");
                String summaryRoad = "";

                if (legs.isArray() && !legs.isEmpty()) {
                    JsonNode leg = legs.get(0);
                    JsonNode stepsNode = leg.path("steps");
                    if (stepsNode.isArray()) {
                        for (JsonNode step : stepsNode) {
                            String roadName = step.path("name").asText("").trim();
                            if (!roadName.isBlank() && summaryRoad.isBlank()) {
                                summaryRoad = roadName;
                            }
                            double stepDist = step.path("distance").asDouble(0.0);
                            double stepDur = step.path("duration").asDouble(0.0);

                            String instruction = buildInstruction(step, roadName);
                            String safetyNote = getRoadSafetyNote(roadName);

                            steps.add(new RouteStepDto(instruction, stepDist, stepDur, roadName, safetyNote));
                        }
                    }
                }

                boolean isRecommended = (i == 0);
                String routeSummary = summaryRoad.isBlank()
                        ? ("Route " + (i + 1) + " (" + formatDistance(distanceMeters) + ")")
                        : ("Via " + summaryRoad);

                String recommendationReason = isRecommended
                        ? "Recommended arterial transit corridor: Prioritizes designated main roads with higher vehicular activity, street lighting, and open businesses."
                        : "Alternative route option: May include secondary streets or connectors; remain mindful of lighting and foot traffic.";

                String googleMapsUrl = buildGoogleMapsUrl(
                        request.originLat(), request.originLng(),
                        request.destinationLat(), request.destinationLng(),
                        travelMode
                );

                alternatives.add(new RouteAlternativeDto(
                        "osrm-route-" + (i + 1),
                        routeSummary,
                        isRecommended,
                        recommendationReason,
                        distanceMeters,
                        durationSeconds,
                        formatDistance(distanceMeters),
                        formatDuration(durationSeconds),
                        STANDARD_PRECAUTIONS,
                        steps,
                        googleMapsUrl
                ));
            }

            return new RouteRecommendationResponseDto(
                    originLabel,
                    destinationLabel,
                    travelMode,
                    "OSRM",
                    alternatives,
                    RouteRecommendationResponseDto.STANDARD_DISCLAIMER,
                    RouteRecommendationResponseDto.STANDARD_HELPLINES
            );
        } catch (Exception ex) {
            log.warn("Failed to parse OSRM response, falling back to geometric corridor: {}", ex.getMessage());
            return buildGeometricCorridorFallback(originLabel, destinationLabel, request, travelMode);
        }
    }

    private RouteRecommendationResponseDto callGoogleDirections(
            String originLabel,
            String destinationLabel,
            RouteRecommendationRequestDto request,
            String travelMode
    ) {
        // Structured Google Directions caller when API key is provided
        String gMode = switch (travelMode) {
            case "WALKING" -> "walking";
            case "TRANSIT" -> "transit";
            default -> "driving";
        };

        String url = String.format(
                Locale.US,
                "https://maps.googleapis.com/maps/api/directions/json?origin=%.6f,%.6f&destination=%.6f,%.6f&mode=%s&key=%s",
                request.originLat(), request.originLng(),
                request.destinationLat(), request.destinationLng(),
                gMode,
                routeProperties.getGoogleApiKey()
        );

        String jsonResponse = restClient.get().uri(url).retrieve().body(String.class);
        // If Google is unreachable or errors, fallback to geometric corridor
        if (jsonResponse == null) {
            return buildGeometricCorridorFallback(originLabel, destinationLabel, request, travelMode);
        }

        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            if (!"OK".equalsIgnoreCase(root.path("status").asText(""))) {
                return buildGeometricCorridorFallback(originLabel, destinationLabel, request, travelMode);
            }

            JsonNode routesNode = root.path("routes");
            List<RouteAlternativeDto> alternatives = new ArrayList<>();

            for (int i = 0; i < routesNode.size(); i++) {
                JsonNode routeNode = routesNode.get(i);
                String summary = routeNode.path("summary").asText("Main Road Corridor");
                JsonNode leg = routeNode.path("legs").get(0);
                double dist = leg.path("distance").path("value").asDouble(0.0);
                double dur = leg.path("duration").path("value").asDouble(0.0);

                List<RouteStepDto> steps = new ArrayList<>();
                JsonNode stepsNode = leg.path("steps");
                if (stepsNode.isArray()) {
                    for (JsonNode step : stepsNode) {
                        String rawInstruction = step.path("html_instructions").asText("").replaceAll("<[^>]*>", " ");
                        double stepDist = step.path("distance").path("value").asDouble(0.0);
                        double stepDur = step.path("duration").path("value").asDouble(0.0);
                        steps.add(new RouteStepDto(rawInstruction, stepDist, stepDur, "", getRoadSafetyNote(rawInstruction)));
                    }
                }

                String googleMapsUrl = buildGoogleMapsUrl(
                        request.originLat(), request.originLng(),
                        request.destinationLat(), request.destinationLng(),
                        travelMode
                );

                alternatives.add(new RouteAlternativeDto(
                        "google-route-" + (i + 1),
                        "Via " + summary,
                        i == 0,
                        i == 0 ? "Recommended primary corridor via main roads." : "Alternative route.",
                        dist,
                        dur,
                        formatDistance(dist),
                        formatDuration(dur),
                        STANDARD_PRECAUTIONS,
                        steps,
                        googleMapsUrl
                ));
            }

            return new RouteRecommendationResponseDto(
                    originLabel,
                    destinationLabel,
                    travelMode,
                    "GOOGLE",
                    alternatives,
                    RouteRecommendationResponseDto.STANDARD_DISCLAIMER,
                    RouteRecommendationResponseDto.STANDARD_HELPLINES
            );
        } catch (Exception ex) {
            return buildGeometricCorridorFallback(originLabel, destinationLabel, request, travelMode);
        }
    }

    private RouteRecommendationResponseDto buildGeometricCorridorFallback(
            String originLabel,
            String destinationLabel,
            RouteRecommendationRequestDto request,
            String travelMode
    ) {
        double distMeters = calculateHaversineDistanceMeters(
                request.originLat(), request.originLng(),
                request.destinationLat(), request.destinationLng()
        );

        // Estimate duration based on realistic urban speeds (Driving: 28 km/h, Walking: 4.5 km/h)
        double speedKmh = "WALKING".equalsIgnoreCase(travelMode) ? 4.5 : 28.0;
        double durationSeconds = (distMeters / 1000.0) / speedKmh * 3600.0;

        String googleMapsUrl = buildGoogleMapsUrl(
                request.originLat(), request.originLng(),
                request.destinationLat(), request.destinationLng(),
                travelMode
        );

        List<RouteStepDto> steps = List.of(
                new RouteStepDto(
                        "Depart from " + originLabel + " towards the nearest well-lit arterial corridor",
                        distMeters * 0.2,
                        durationSeconds * 0.2,
                        "Main Access Avenue",
                        "Ensure street lighting is visible; avoid dark service alleys"
                ),
                new RouteStepDto(
                        "Follow main transit road directly towards " + destinationLabel,
                        distMeters * 0.6,
                        durationSeconds * 0.6,
                        "Primary Arterial Road",
                        "High visibility thoroughfare with active traffic and commercial establishments"
                ),
                new RouteStepDto(
                        "Arrive at destination: " + destinationLabel,
                        distMeters * 0.2,
                        durationSeconds * 0.2,
                        "Destination Approach",
                        "Ensure building entrance or pickup area is well illuminated"
                )
        );

        RouteAlternativeDto primaryRoute = new RouteAlternativeDto(
                "corridor-primary",
                "Direct Arterial Corridor (" + formatDistance(distMeters) + ")",
                true,
                "Estimated direct arterial corridor. Always prioritize main multi-lane roads with active commercial establishments and street lighting.",
                distMeters,
                durationSeconds,
                formatDistance(distMeters),
                formatDuration(durationSeconds),
                STANDARD_PRECAUTIONS,
                steps,
                googleMapsUrl
        );

        return new RouteRecommendationResponseDto(
                originLabel,
                destinationLabel,
                travelMode,
                "GEOMETRIC_CORRIDOR",
                List.of(primaryRoute),
                RouteRecommendationResponseDto.STANDARD_DISCLAIMER,
                RouteRecommendationResponseDto.STANDARD_HELPLINES
        );
    }

    private RouteRecommendationResponseDto buildAddressBasedRecommendation(
            String originLabel,
            String destinationLabel,
            String travelMode
    ) {
        String googleMapsUrl = buildGoogleMapsUrlByAddress(originLabel, destinationLabel, travelMode);

        List<RouteStepDto> steps = List.of(
                new RouteStepDto(
                        "Start from " + originLabel,
                        0.0,
                        0.0,
                        "Origin",
                        "Confirm meeting or pickup point is in a visible, well-lit area"
                ),
                new RouteStepDto(
                        "Follow major arterial streets and public transit corridors towards " + destinationLabel,
                        0.0,
                        0.0,
                        "Primary Transit Corridor",
                        "Stay on primary roads with continuous street lighting and active foot or vehicular traffic"
                ),
                new RouteStepDto(
                        "Arrive safely at " + destinationLabel,
                        0.0,
                        0.0,
                        "Destination",
                        "Have your trusted contact notified when you arrive"
                )
        );

        RouteAlternativeDto routeAlternative = new RouteAlternativeDto(
                "address-corridor",
                "Arterial Route recommendation to " + destinationLabel,
                true,
                "Route recommendation based on entered addresses. Tap 'Open in Google Maps' for real-time turn-by-turn navigation.",
                0.0,
                0.0,
                "Calculated on map",
                "Calculated on map",
                STANDARD_PRECAUTIONS,
                steps,
                googleMapsUrl
        );

        return new RouteRecommendationResponseDto(
                originLabel,
                destinationLabel,
                travelMode,
                "ADDRESS_CORRIDOR",
                List.of(routeAlternative),
                RouteRecommendationResponseDto.STANDARD_DISCLAIMER,
                RouteRecommendationResponseDto.STANDARD_HELPLINES
        );
    }

    private double calculateHaversineDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371e3; // Earth radius in meters
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private String buildInstruction(JsonNode stepNode, String roadName) {
        JsonNode maneuver = stepNode.path("maneuver");
        String type = maneuver.path("type").asText("turn");
        String modifier = maneuver.path("modifier").asText("");

        StringBuilder sb = new StringBuilder();
        if ("depart".equalsIgnoreCase(type)) {
            sb.append("Depart");
        } else if ("arrive".equalsIgnoreCase(type)) {
            sb.append("Arrive at waypoint");
        } else {
            sb.append(capitalize(type));
            if (!modifier.isBlank()) {
                sb.append(" ").append(modifier);
            }
        }

        if (!roadName.isBlank()) {
            sb.append(" onto ").append(roadName);
        }
        return sb.toString();
    }

    private String getRoadSafetyNote(String roadName) {
        if (roadName == null || roadName.isBlank()) {
            return "Local connector street: Maintain situational awareness and stay on lit paths.";
        }
        String lower = roadName.toLowerCase(Locale.ROOT);
        if (lower.contains("marg") || lower.contains("road") || lower.contains("rd") ||
                lower.contains("expressway") || lower.contains("highway") || lower.contains("avenue") ||
                lower.contains("flyover") || lower.contains("bypass") || lower.contains("corridor")) {
            return "Main arterial corridor: Higher visibility, active traffic flow, and street lighting.";
        }
        return "Connecting road: Keep phone handy and verify your surroundings.";
    }

    private String formatDistance(double meters) {
        if (meters >= 1000.0) {
            return String.format(Locale.US, "%.1f km", meters / 1000.0);
        }
        return String.format(Locale.US, "%.0f m", meters);
    }

    private String formatDuration(double seconds) {
        long totalMinutes = Math.round(seconds / 60.0);
        if (totalMinutes < 1) {
            return "< 1 min";
        }
        if (totalMinutes >= 60) {
            long hours = totalMinutes / 60;
            long mins = totalMinutes % 60;
            return mins > 0 ? (hours + " hr " + mins + " min") : (hours + " hr");
        }
        return totalMinutes + " mins";
    }

    private String buildGoogleMapsUrl(double oLat, double oLng, double dLat, double dLng, String travelMode) {
        String mode = switch (travelMode.toUpperCase(Locale.ROOT)) {
            case "WALKING" -> "walking";
            case "TRANSIT" -> "transit";
            default -> "driving";
        };
        return String.format(Locale.US, "https://www.google.com/maps/dir/?api=1&origin=%.6f,%.6f&destination=%.6f,%.6f&travelmode=%s",
                oLat, oLng, dLat, dLng, mode);
    }

    private String buildGoogleMapsUrlByAddress(String origin, String destination, String travelMode) {
        String mode = switch (travelMode.toUpperCase(Locale.ROOT)) {
            case "WALKING" -> "walking";
            case "TRANSIT" -> "transit";
            default -> "driving";
        };
        return String.format("https://www.google.com/maps/dir/?api=1&origin=%s&destination=%s&travelmode=%s",
                URLEncoder.encode(origin, StandardCharsets.UTF_8),
                URLEncoder.encode(destination, StandardCharsets.UTF_8),
                mode);
    }

    private String capitalize(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        return Character.toUpperCase(text.charAt(0)) + text.substring(1).toLowerCase(Locale.ROOT);
    }
}
