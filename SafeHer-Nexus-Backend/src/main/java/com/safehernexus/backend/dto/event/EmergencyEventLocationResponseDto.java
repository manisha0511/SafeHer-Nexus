package com.safehernexus.backend.dto.event;

import com.safehernexus.backend.entity.EmergencyEventLocation;

import java.time.Instant;

public record EmergencyEventLocationResponseDto(
        Long id,
        Long emergencyEventId,
        Double latitude,
        Double longitude,
        Double accuracyMeters,
        Double altitudeMeters,
        Double speedMps,
        Double headingDegrees,
        Instant recordedAt,
        Instant createdAt
) {
    public static EmergencyEventLocationResponseDto fromEntity(EmergencyEventLocation entity) {
        return new EmergencyEventLocationResponseDto(
                entity.getId(),
                entity.getEmergencyEvent() != null ? entity.getEmergencyEvent().getId() : null,
                entity.getLatitude(),
                entity.getLongitude(),
                entity.getAccuracyMeters(),
                entity.getAltitudeMeters(),
                entity.getSpeedMps(),
                entity.getHeadingDegrees(),
                entity.getRecordedAt(),
                entity.getCreatedAt()
        );
    }
}
