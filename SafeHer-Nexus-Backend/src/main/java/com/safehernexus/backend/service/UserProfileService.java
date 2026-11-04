package com.safehernexus.backend.service;

import com.safehernexus.backend.dto.auth.UserResponseDto;
import com.safehernexus.backend.dto.profile.UpdateUserProfileRequestDto;
import com.safehernexus.backend.entity.User;
import com.safehernexus.backend.exception.InvalidCredentialsException;
import com.safehernexus.backend.exception.ResourceNotFoundException;
import com.safehernexus.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final UserRepository userRepository;

    public UserProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserResponseDto getMyProfile(String authenticatedEmail) {
        User user = getAuthenticatedUserEntity(authenticatedEmail);
        return UserResponseDto.fromEntity(user);
    }

    @Transactional
    public UserResponseDto updateMyProfile(String authenticatedEmail, UpdateUserProfileRequestDto request) {
        User user = getAuthenticatedUserEntity(authenticatedEmail);

        user.setName(request.name().trim());

        if (request.phoneNumber() == null || request.phoneNumber().isBlank()) {
            user.setPhoneNumber(null);
        } else {
            user.setPhoneNumber(request.phoneNumber().trim());
        }

        if (request.safetyNote() == null || request.safetyNote().isBlank()) {
            user.setSafetyNote(null);
        } else {
            user.setSafetyNote(request.safetyNote().trim());
        }

        User updatedUser = userRepository.save(user);
        return UserResponseDto.fromEntity(updatedUser);
    }

    @Transactional(readOnly = true)
    public User getAuthenticatedUserEntity(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            throw new InvalidCredentialsException("Authentication is required");
        }
        return userRepository.findByEmailIgnoreCase(authenticatedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user account was not found"));
    }
}
