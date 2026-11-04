package com.safehernexus.backend.dto.error;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponseDto(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> validationErrors
) {
    public static ApiErrorResponseDto of(int status, String error, String message, String path) {
        return new ApiErrorResponseDto(Instant.now(), status, error, message, path, null);
    }

    public static ApiErrorResponseDto withValidation(
            int status,
            String error,
            String message,
            String path,
            Map<String, String> validationErrors
    ) {
        return new ApiErrorResponseDto(Instant.now(), status, error, message, path, validationErrors);
    }
}
