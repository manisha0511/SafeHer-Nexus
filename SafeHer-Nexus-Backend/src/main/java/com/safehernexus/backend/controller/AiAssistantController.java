package com.safehernexus.backend.controller;

import com.safehernexus.backend.dto.ai.AiAssistantRequestDto;
import com.safehernexus.backend.dto.ai.AiAssistantResponseDto;
import com.safehernexus.backend.exception.InvalidCredentialsException;
import com.safehernexus.backend.service.AiSafetyAssistantService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/assistant")
public class AiAssistantController {

    private final AiSafetyAssistantService aiSafetyAssistantService;

    public AiAssistantController(AiSafetyAssistantService aiSafetyAssistantService) {
        this.aiSafetyAssistantService = aiSafetyAssistantService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AiAssistantResponseDto> chat(
            Authentication authentication,
            @Valid @RequestBody AiAssistantRequestDto request
    ) {
        String email = requireAuthenticatedEmail(authentication);
        AiAssistantResponseDto response = aiSafetyAssistantService.processUserMessage(email, request);
        return ResponseEntity.ok(response);
    }

    private String requireAuthenticatedEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidCredentialsException("Authentication is required");
        }
        return authentication.getName();
    }
}
