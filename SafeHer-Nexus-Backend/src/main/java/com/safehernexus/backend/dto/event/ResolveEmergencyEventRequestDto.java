package com.safehernexus.backend.dto.event;

import jakarta.validation.constraints.Size;

public record ResolveEmergencyEventRequestDto(
        @Size(max = 255, message = "Resolution notes must not exceed 255 characters")
        String resolutionNotes
) {
}
