package com.safehernexus.backend.service;

import com.safehernexus.backend.dto.auth.AuthResponseDto;
import com.safehernexus.backend.dto.auth.LoginRequestDto;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.dto.auth.UserResponseDto;
import com.safehernexus.backend.entity.Role;
import com.safehernexus.backend.entity.User;
import com.safehernexus.backend.exception.EmailAlreadyExistsException;
import com.safehernexus.backend.exception.InvalidCredentialsException;
import com.safehernexus.backend.exception.ResourceNotFoundException;
import com.safehernexus.backend.repository.UserRepository;
import com.safehernexus.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponseDto register(RegisterRequestDto request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        String trimmedName = request.name().trim();

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new EmailAlreadyExistsException("An account with this email address already exists");
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User newUser = new User(trimmedName, normalizedEmail, passwordHash, Role.ROLE_USER);
        User savedUser = userRepository.save(newUser);

        String accessToken = jwtService.generateAccessToken(savedUser);
        return AuthResponseDto.bearer(
                accessToken,
                jwtService.getExpirationMs(),
                UserResponseDto.fromEntity(savedUser)
        );
    }

    @Transactional(readOnly = true)
    public AuthResponseDto login(LoginRequestDto request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String accessToken = jwtService.generateAccessToken(user);
        return AuthResponseDto.bearer(
                accessToken,
                jwtService.getExpirationMs(),
                UserResponseDto.fromEntity(user)
        );
    }

    @Transactional(readOnly = true)
    public UserResponseDto getCurrentUser(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            throw new InvalidCredentialsException("Authentication is required");
        }

        User user = userRepository.findByEmailIgnoreCase(authenticatedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user account was not found"));

        return UserResponseDto.fromEntity(user);
    }
}
