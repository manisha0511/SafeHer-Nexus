package com.safehernexus.backend.dto.auth;

public record AuthResponseDto(
        String accessToken,
        String tokenType,
        long expiresInMs,
        UserResponseDto user
) {
    public static AuthResponseDto bearer(String accessToken, long expiresInMs, UserResponseDto user) {
        return new AuthResponseDto(accessToken, "Bearer", expiresInMs, user);
    }

    @Override
    public String toString() {
        return "AuthResponseDto{tokenType='" + tokenType + "', expiresInMs=" + expiresInMs + ", user=" + user + "}";
    }
}
