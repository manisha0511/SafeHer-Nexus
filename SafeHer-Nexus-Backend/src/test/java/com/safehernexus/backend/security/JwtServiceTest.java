package com.safehernexus.backend.security;

import com.safehernexus.backend.entity.Role;
import com.safehernexus.backend.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String VALID_SECRET =
            "unit_test_secret_key_that_is_at_least_32_bytes_in_length_12345";

    @Test
    @DisplayName("Generates valid JWT and extracts subject email")
    void shouldGenerateAndValidateToken() {
        JwtService jwtService = new JwtService(VALID_SECRET, 60_000L);
        User user = new User("Neha Gupta", "neha@example.com", "$2a$10$hash", Role.ROLE_USER);
        user.setId(42L);

        String token = jwtService.generateAccessToken(user);
        Optional<String> extractedEmail = jwtService.validateAndExtractEmail(token);

        assertThat(extractedEmail).isPresent().contains("neha@example.com");
    }

    @Test
    @DisplayName("Rejects expired JWT tokens")
    void shouldRejectExpiredToken() {
        JwtService expiredJwtService = new JwtService(VALID_SECRET, -1000L);
        User user = new User("Neha Gupta", "neha@example.com", "$2a$10$hash", Role.ROLE_USER);
        user.setId(42L);

        String expiredToken = expiredJwtService.generateAccessToken(user);
        Optional<String> extractedEmail = expiredJwtService.validateAndExtractEmail(expiredToken);

        assertThat(extractedEmail).isEmpty();
    }

    @Test
    @DisplayName("Rejects token signed with a different secret key")
    void shouldRejectTokenWithInvalidSignature() {
        JwtService signer = new JwtService(VALID_SECRET, 60_000L);
        JwtService verifier = new JwtService(
                "different_secret_key_that_is_also_at_least_32_bytes_long_99999",
                60_000L
        );

        User user = new User("Neha Gupta", "neha@example.com", "$2a$10$hash", Role.ROLE_USER);
        user.setId(42L);

        String token = signer.generateAccessToken(user);
        assertThat(verifier.validateAndExtractEmail(token)).isEmpty();
    }

    @Test
    @DisplayName("Rejects weak JWT secrets shorter than 32 bytes")
    void shouldRejectWeakSecret() {
        assertThatThrownBy(() -> new JwtService("too_short_secret", 60_000L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
