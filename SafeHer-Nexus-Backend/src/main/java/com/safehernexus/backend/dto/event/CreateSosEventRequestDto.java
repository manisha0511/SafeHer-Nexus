package com.safehernexus.backend.dto.event;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateSosEventRequestDto(
        @DecimalMin(value = "-90.0", message = "Latitude must be between -90.0 and 90.0")
        @DecimalMax(value = "90.0", message = "Latitude must be between -90.0 and 90.0")
        Double latitude,

        @DecimalMin(value = "-180.0", message = "Longitude must be between -180.0 and 180.0")
        @DecimalMax(value = "180.0", message = "Longitude must be between -180.0 and 180.0")
        Double longitude,

        @DecimalMin(value = "0.0", message = "Location accuracy must be 0 or greater")
        @DecimalMax(value = "50000.0", message = "Location accuracy must not exceed 50000 meters")
        Double locationAccuracyMeters,

        Instant locationCapturedAt,

        @Size(max = 160, message = "Location label must not exceed 160 characters")
        String locationLabel,

        @Size(max = 255, message = "Notes must not exceed 255 characters")
        String notes
) {
}
