package com.safehernexus.backend.controller;

import com.safehernexus.backend.dto.route.RouteRecommendationRequestDto;
import com.safehernexus.backend.dto.route.RouteRecommendationResponseDto;
import com.safehernexus.backend.exception.InvalidCredentialsException;
import com.safehernexus.backend.service.RouteService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    private final RouteService routeService;

    public RouteController(RouteService routeService) {
        this.routeService = routeService;
    }

    @PostMapping("/recommendations")
    public ResponseEntity<RouteRecommendationResponseDto> getRecommendations(
            Authentication authentication,
            @Valid @RequestBody RouteRecommendationRequestDto request
    ) {
        requireAuthenticatedEmail(authentication);
        RouteRecommendationResponseDto response = routeService.getRouteRecommendations(request);
        return ResponseEntity.ok(response);
    }

    private String requireAuthenticatedEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidCredentialsException("Authentication is required");
        }
        return authentication.getName();
    }
}
