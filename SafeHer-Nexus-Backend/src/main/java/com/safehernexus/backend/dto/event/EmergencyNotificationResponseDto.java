package com.safehernexus.backend.dto.event;

import com.safehernexus.backend.entity.EmergencyNotification;

import java.time.Instant;

public record EmergencyNotificationResponseDto(
        Long id,
        Long emergencyEventId,
        Long emergencyContactId,
        String recipientPhone,
        String recipientName,
        String messageBody,
        String status,
        String providerMessageId,
        String errorMessage,
        Instant sentAt,
        Instant deliveredAt,
        Instant createdAt
) {
    public static EmergencyNotificationResponseDto fromEntity(EmergencyNotification entity) {
        return new EmergencyNotificationResponseDto(
                entity.getId(),
                entity.getEmergencyEvent() != null ? entity.getEmergencyEvent().getId() : null,
                entity.getEmergencyContact() != null ? entity.getEmergencyContact().getId() : null,
                entity.getRecipientPhone(),
                entity.getRecipientName(),
                entity.getMessageBody(),
                entity.getStatus().name(),
                entity.getProviderMessageId(),
                entity.getErrorMessage(),
                entity.getSentAt(),
                entity.getDeliveredAt(),
                entity.getCreatedAt()
        );
    }
}
