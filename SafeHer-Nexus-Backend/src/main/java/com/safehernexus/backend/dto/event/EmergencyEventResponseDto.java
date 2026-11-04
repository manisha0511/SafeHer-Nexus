package com.safehernexus.backend.dto.event;

import com.safehernexus.backend.entity.EmergencyEvent;
import com.safehernexus.backend.entity.EmergencyEventLocation;
import com.safehernexus.backend.entity.EmergencyNotification;
import com.safehernexus.backend.entity.NotificationDeliveryStatus;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

public record EmergencyEventResponseDto(
        Long id,
        String eventType,
        String status,
        String notificationStatus,
        String notificationStatusMessage,
        boolean locationAttached,
        Double initialLatitude,
        Double initialLongitude,
        Double locationAccuracyMeters,
        Instant locationCapturedAt,
        String locationLabel,
        String notes,
        Instant createdAt,
        Instant resolvedAt,
        Long locationUpdatesCount,
        EmergencyEventLocationResponseDto latestLocation,
        List<EmergencyNotificationResponseDto> notifications
) {
    public static EmergencyEventResponseDto fromEntity(EmergencyEvent entity) {
        return fromEntity(entity, 0L, null, Collections.emptyList());
    }

    public static EmergencyEventResponseDto fromEntity(
            EmergencyEvent entity,
            Long locationUpdatesCount,
            EmergencyEventLocation latestLocation,
            List<EmergencyNotification> notifications
    ) {
        NotificationDeliveryStatus deliveryStatus = entity.getNotificationStatus() != null
                ? entity.getNotificationStatus()
                : NotificationDeliveryStatus.NOT_CONFIGURED;

        String deliveryMessage = switch (deliveryStatus) {
            case NOT_CONFIGURED ->
                    "Notification delivery provider (SMS/push/calls) is not configured yet. Event was recorded in SafeHer Nexus, but no contacts or emergency services were automatically notified.";
            case QUEUED ->
                    "Notifications have been queued for delivery, awaiting confirmation.";
            case SENT ->
                    "Emergency notifications have been sent via SMS, awaiting delivery confirmation.";
            case DELIVERED ->
                    "Notification delivery confirmed.";
            case FAILED ->
                    "Notification delivery failed. Please contact trusted people or emergency services directly.";
        };

        EmergencyEventLocationResponseDto latestLocationDto = latestLocation != null
                ? EmergencyEventLocationResponseDto.fromEntity(latestLocation)
                : null;

        List<EmergencyNotificationResponseDto> notificationDtos = notifications != null
                ? notifications.stream().map(EmergencyNotificationResponseDto::fromEntity).toList()
                : Collections.emptyList();

        return new EmergencyEventResponseDto(
                entity.getId(),
                entity.getEventType().name(),
                entity.getStatus().name(),
                deliveryStatus.name(),
                deliveryMessage,
                entity.isLocationAttached(),
                entity.getInitialLatitude(),
                entity.getInitialLongitude(),
                entity.getLocationAccuracyMeters(),
                entity.getLocationCapturedAt(),
                entity.getLocationLabel(),
                entity.getNotes(),
                entity.getCreatedAt(),
                entity.getResolvedAt(),
                locationUpdatesCount != null ? locationUpdatesCount : 0L,
                latestLocationDto,
                notificationDtos
        );
    }
}
