package com.safehernexus.backend.dto.auth;

import com.safehernexus.backend.entity.User;

import java.time.Instant;

public record UserResponseDto(
        Long id,
        String name,
        String email,
        String phoneNumber,
        String safetyNote,
        String role,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponseDto fromEntity(User user) {
        return new UserResponseDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getSafetyNote(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
