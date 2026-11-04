package com.safehernexus.backend.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequestDto(
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        String name,

        @Pattern(
                regexp = "^$|^\\+?[0-9\\-\\s()]{7,20}$",
                message = "Phone number must be between 7 and 20 digits and may include +, spaces, hyphens, or parentheses"
        )
        @Size(max = 25, message = "Phone number must not exceed 25 characters")
        String phoneNumber,

        @Size(max = 250, message = "Safety note must not exceed 250 characters")
        String safetyNote
) {
}
