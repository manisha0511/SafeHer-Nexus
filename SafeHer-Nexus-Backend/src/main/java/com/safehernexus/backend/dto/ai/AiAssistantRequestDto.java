package com.safehernexus.backend.dto.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiAssistantRequestDto(
        @NotBlank(message = "Message cannot be empty")
        @Size(max = 1000, message = "Message must not exceed 1000 characters")
        String message,

        String conversationId
) {
    public AiAssistantRequestDto(String message) {
        this(message, null);
    }
}
