package com.safehernexus.backend.controller;

import com.safehernexus.backend.dto.contact.EmergencyContactRequestDto;
import com.safehernexus.backend.dto.contact.EmergencyContactResponseDto;
import com.safehernexus.backend.exception.InvalidCredentialsException;
import com.safehernexus.backend.service.EmergencyContactService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/emergency-contacts")
public class EmergencyContactController {

    private final EmergencyContactService emergencyContactService;

    public EmergencyContactController(EmergencyContactService emergencyContactService) {
        this.emergencyContactService = emergencyContactService;
    }

    @GetMapping
    public ResponseEntity<List<EmergencyContactResponseDto>> listMyContacts(Authentication authentication) {
        String email = requireAuthenticatedEmail(authentication);
        return ResponseEntity.ok(emergencyContactService.listMyContacts(email));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmergencyContactResponseDto> getMyContactById(
            Authentication authentication,
            @PathVariable("id") Long id
    ) {
        String email = requireAuthenticatedEmail(authentication);
        return ResponseEntity.ok(emergencyContactService.getMyContactById(email, id));
    }

    @PostMapping
    public ResponseEntity<EmergencyContactResponseDto> createContact(
            Authentication authentication,
            @Valid @RequestBody EmergencyContactRequestDto request
    ) {
        String email = requireAuthenticatedEmail(authentication);
        EmergencyContactResponseDto created = emergencyContactService.createContact(email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmergencyContactResponseDto> updateContact(
            Authentication authentication,
            @PathVariable("id") Long id,
            @Valid @RequestBody EmergencyContactRequestDto request
    ) {
        String email = requireAuthenticatedEmail(authentication);
        EmergencyContactResponseDto updated = emergencyContactService.updateContact(email, id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(
            Authentication authentication,
            @PathVariable("id") Long id
    ) {
        String email = requireAuthenticatedEmail(authentication);
        emergencyContactService.deleteContact(email, id);
        return ResponseEntity.noContent().build();
    }

    private String requireAuthenticatedEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidCredentialsException("Authentication is required");
        }
        return authentication.getName();
    }
}
