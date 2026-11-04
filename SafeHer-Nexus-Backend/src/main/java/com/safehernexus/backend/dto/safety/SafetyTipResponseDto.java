package com.safehernexus.backend.dto.safety;

import com.safehernexus.backend.entity.SafetyTip;

public record SafetyTipResponseDto(
        Long id,
        String category,
        String title,
        String content,
        String emergencyNumber,
        boolean helpline,
        int displayOrder
) {
    public static SafetyTipResponseDto fromEntity(SafetyTip entity) {
        return new SafetyTipResponseDto(
                entity.getId(),
                entity.getCategory().name(),
                entity.getTitle(),
                entity.getContent(),
                entity.getEmergencyNumber(),
                entity.isHelpline(),
                entity.getDisplayOrder()
        );
    }
}
