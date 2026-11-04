package com.safehernexus.backend.dto.contact;

import com.safehernexus.backend.entity.EmergencyContact;

import java.time.Instant;

public record EmergencyContactResponseDto(
        Long id,
        String name,
        String phoneNumber,
        String relationship,
        String email,
        boolean primaryContact,
        Instant createdAt,
        Instant updatedAt
) {
    public static EmergencyContactResponseDto fromEntity(EmergencyContact entity) {
        return new EmergencyContactResponseDto(
                entity.getId(),
                entity.getName(),
                entity.getPhoneNumber(),
                entity.getRelationship(),
                entity.getEmail(),
                entity.isPrimaryContact(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
