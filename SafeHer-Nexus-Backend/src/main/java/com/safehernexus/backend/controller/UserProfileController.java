package com.safehernexus.backend.controller;

import com.safehernexus.backend.dto.auth.UserResponseDto;
import com.safehernexus.backend.dto.profile.UpdateUserProfileRequestDto;
import com.safehernexus.backend.exception.InvalidCredentialsException;
import com.safehernexus.backend.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getMyProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidCredentialsException("Authentication is required");
        }
        return ResponseEntity.ok(userProfileService.getMyProfile(authentication.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponseDto> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateUserProfileRequestDto request
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidCredentialsException("Authentication is required");
        }
        return ResponseEntity.ok(userProfileService.updateMyProfile(authentication.getName(), request));
    }
}
