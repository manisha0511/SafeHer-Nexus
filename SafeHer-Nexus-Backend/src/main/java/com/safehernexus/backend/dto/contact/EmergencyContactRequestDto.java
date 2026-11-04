package com.safehernexus.backend.dto.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record EmergencyContactRequestDto(
        @NotBlank(message = "Contact name is required")
        @Size(min = 2, max = 100, message = "Contact name must be between 2 and 100 characters")
        String name,

        @NotBlank(message = "Phone number is required")
        @Pattern(
                regexp = "^\\+?[0-9\\-\\s()]{7,20}$",
                message = "Phone number must be between 7 and 20 digits and may include +, spaces, hyphens, or parentheses"
        )
        @Size(max = 25, message = "Phone number must not exceed 25 characters")
        String phoneNumber,

        @NotBlank(message = "Relationship is required")
        @Size(min = 2, max = 50, message = "Relationship must be between 2 and 50 characters")
        String relationship,

        @Email(message = "Must be a valid email address")
        @Size(max = 180, message = "Email must not exceed 180 characters")
        String email,

        Boolean primaryContact
) {
}
