package com.safehernexus.backend.controller;

import com.safehernexus.backend.dto.common.PagedResponseDto;
import com.safehernexus.backend.dto.event.CreateSosEventRequestDto;
import com.safehernexus.backend.dto.event.EmergencyEventLocationResponseDto;
import com.safehernexus.backend.dto.event.EmergencyEventResponseDto;
import com.safehernexus.backend.dto.event.EmergencyNotificationResponseDto;
import com.safehernexus.backend.dto.event.RecordLocationUpdateRequestDto;
import com.safehernexus.backend.dto.event.ResolveEmergencyEventRequestDto;
import com.safehernexus.backend.exception.InvalidCredentialsException;
import com.safehernexus.backend.service.EmergencyEventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/emergency-events")
public class EmergencyEventController {

    private final EmergencyEventService emergencyEventService;

    public EmergencyEventController(EmergencyEventService emergencyEventService) {
        this.emergencyEventService = emergencyEventService;
    }

    @PostMapping
    public ResponseEntity<EmergencyEventResponseDto> createSosEvent(
            Authentication authentication,
            @Valid @RequestBody(required = false) CreateSosEventRequestDto request
    ) {
        String email = requireAuthenticatedEmail(authentication);
        EmergencyEventResponseDto created = emergencyEventService.createSosEvent(email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/active")
    public ResponseEntity<EmergencyEventResponseDto> getMyActiveEvent(Authentication authentication) {
        String email = requireAuthenticatedEmail(authentication);
        Optional<EmergencyEventResponseDto> activeEvent = emergencyEventService.getMyActiveEvent(email);
        return activeEvent
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<EmergencyEventResponseDto> resolveMyEvent(
            Authentication authentication,
            @PathVariable("id") Long id,
            @Valid @RequestBody(required = false) ResolveEmergencyEventRequestDto request
    ) {
        String email = requireAuthenticatedEmail(authentication);
        EmergencyEventResponseDto resolved = emergencyEventService.resolveMyEvent(email, id, request);
        return ResponseEntity.ok(resolved);
    }

    @GetMapping
    public ResponseEntity<PagedResponseDto<EmergencyEventResponseDto>> listMyEvents(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        String email = requireAuthenticatedEmail(authentication);
        return ResponseEntity.ok(emergencyEventService.listMyEvents(email, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmergencyEventResponseDto> getMyEventById(
            Authentication authentication,
            @PathVariable("id") Long id
    ) {
        String email = requireAuthenticatedEmail(authentication);
        return ResponseEntity.ok(emergencyEventService.getMyEventById(email, id));
    }

    @PostMapping("/{id}/locations")
    public ResponseEntity<EmergencyEventLocationResponseDto> recordLocationUpdate(
            Authentication authentication,
            @PathVariable("id") Long id,
            @Valid @RequestBody RecordLocationUpdateRequestDto request
    ) {
        String email = requireAuthenticatedEmail(authentication);
        EmergencyEventLocationResponseDto recorded = emergencyEventService.recordLocationUpdate(email, id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(recorded);
    }

    @GetMapping("/{id}/locations")
    public ResponseEntity<List<EmergencyEventLocationResponseDto>> getEventLocations(
            Authentication authentication,
            @PathVariable("id") Long id
    ) {
        String email = requireAuthenticatedEmail(authentication);
        return ResponseEntity.ok(emergencyEventService.getEventLocations(email, id));
    }

    @GetMapping("/{id}/notifications")
    public ResponseEntity<List<EmergencyNotificationResponseDto>> getEventNotifications(
            Authentication authentication,
            @PathVariable("id") Long id
    ) {
        String email = requireAuthenticatedEmail(authentication);
        return ResponseEntity.ok(emergencyEventService.getEventNotifications(email, id));
    }

    @PostMapping("/notifications/twilio-callback")
    public ResponseEntity<Void> handleTwilioCallback(
            @RequestParam(value = "MessageSid", required = false) String messageSid,
            @RequestParam(value = "MessageStatus", required = false) String messageStatus,
            @RequestParam(value = "ErrorMessage", required = false) String errorMessage
    ) {
        emergencyEventService.handleTwilioDeliveryCallback(messageSid, messageStatus, errorMessage);
        return ResponseEntity.ok().build();
    }

    private String requireAuthenticatedEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidCredentialsException("Authentication is required");
        }
        return authentication.getName();
    }
}
