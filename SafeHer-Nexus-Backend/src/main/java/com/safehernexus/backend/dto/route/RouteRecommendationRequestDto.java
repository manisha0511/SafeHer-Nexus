package com.safehernexus.backend.dto.route;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RouteRecommendationRequestDto(
        @Size(max = 250, message = "Origin description cannot exceed 250 characters")
        String origin,

        @NotBlank(message = "Destination is required")
        @Size(max = 250, message = "Destination description cannot exceed 250 characters")
        String destination,

        @DecimalMin(value = "-90.0", message = "Origin latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Origin latitude must be between -90 and 90")
        Double originLat,

        @DecimalMin(value = "-180.0", message = "Origin longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Origin longitude must be between -180 and 180")
        Double originLng,

        @DecimalMin(value = "-90.0", message = "Destination latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Destination latitude must be between -90 and 90")
        Double destinationLat,

        @DecimalMin(value = "-180.0", message = "Destination longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Destination longitude must be between -180 and 180")
        Double destinationLng,

        String travelMode
) {
    public boolean hasOriginCoordinates() {
        return originLat != null && originLng != null;
    }

    public boolean hasDestinationCoordinates() {
        return destinationLat != null && destinationLng != null;
    }

    public boolean hasFullCoordinates() {
        return hasOriginCoordinates() && hasDestinationCoordinates();
    }
}
