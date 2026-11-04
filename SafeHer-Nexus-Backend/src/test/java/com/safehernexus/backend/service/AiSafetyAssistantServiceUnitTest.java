package com.safehernexus.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.config.AiProperties;
import com.safehernexus.backend.dto.ai.AiAssistantRequestDto;
import com.safehernexus.backend.dto.ai.AiAssistantResponseDto;
import com.safehernexus.backend.entity.SafetyCategory;
import com.safehernexus.backend.entity.SafetyTip;
import com.safehernexus.backend.exception.BusinessRuleViolationException;
import com.safehernexus.backend.exception.RateLimitExceededException;
import com.safehernexus.backend.repository.SafetyTipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiSafetyAssistantServiceUnitTest {

    private AiProperties aiProperties;
    private SafetyTipRepository safetyTipRepository;
    private ObjectMapper objectMapper;
    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private AiSafetyAssistantService service;

    @BeforeEach
    void setUp() {
        aiProperties = new AiProperties();
        safetyTipRepository = mock(SafetyTipRepository.class);
        objectMapper = new ObjectMapper();
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();

        service = new AiSafetyAssistantService(
                aiProperties,
                safetyTipRepository,
                objectMapper,
                restClientBuilder.build()
        );

        when(safetyTipRepository.findAllByOrderByDisplayOrderAscIdAsc()).thenReturn(List.of(
                new SafetyTip(SafetyCategory.HELPLINES, "National Emergency", "Assistance", "112", true, 1),
                new SafetyTip(SafetyCategory.TRAVEL, "Verify Driver", "Check plates", null, false, 2)
        ));
    }

    @Test
    @DisplayName("Throws BusinessRuleViolationException when message is empty or whitespace")
    void shouldRejectEmptyMessage() {
        assertThrows(BusinessRuleViolationException.class, () ->
                service.processUserMessage("user@example.com", new AiAssistantRequestDto(""))
        );
        assertThrows(BusinessRuleViolationException.class, () ->
                service.processUserMessage("user@example.com", new AiAssistantRequestDto("    "))
        );
    }

    @Test
    @DisplayName("Intercepts imminent danger keywords and activates EMERGENCY_OVERRIDE immediately")
    void shouldTriggerEmergencyOverrideOnDangerKeywords() {
        AiAssistantRequestDto req = new AiAssistantRequestDto("I think someone is following me down the dark road, help me!");

        AiAssistantResponseDto response = service.processUserMessage("test@example.com", req);

        assertTrue(response.isEmergency());
        assertEquals("EMERGENCY_OVERRIDE", response.source());
        assertNotNull(response.emergencyActionRecommended());
        assertTrue(response.reply().contains("112"));
        assertTrue(response.reply().contains("SOS"));
        assertTrue(response.suggestedHelplines().stream().anyMatch(h -> h.contains("112")));
    }

    @Test
    @DisplayName("Calls external AI provider when configured and parses response correctly")
    void shouldCallAiProviderWhenConfigured() {
        aiProperties.setEnabled(true);
        aiProperties.setApiKey("test-gemini-api-key");
        aiProperties.setModel("gemini-1.5-flash");
        aiProperties.setEndpoint("https://generativelanguage.googleapis.com/v1beta");

        String geminiSuccessJson = """
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {
                                        "text": "When walking alone at night, stay on illuminated arterial streets, keep your phone easily reachable, and share your live ride tracking with trusted contacts."
                                    }
                                ]
                            }
                        }
                    ]
                }
                """;

        mockServer.expect(requestTo(org.hamcrest.Matchers.startsWith("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent")))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(geminiSuccessJson, MediaType.APPLICATION_JSON));

        AiAssistantRequestDto req = new AiAssistantRequestDto("What are good safety precautions for a late walk?");
        AiAssistantResponseDto response = service.processUserMessage("test@example.com", req);

        mockServer.verify();
        assertFalse(response.isEmergency());
        assertEquals("AI_PROVIDER", response.source());
        assertTrue(response.reply().contains("illuminated arterial streets"));
    }

    @Test
    @DisplayName("Gracefully falls back to verified knowledge base when external AI provider fails")
    void shouldFallbackToKnowledgeBaseOnAiProviderFailure() {
        aiProperties.setEnabled(true);
        aiProperties.setApiKey("test-gemini-api-key");
        aiProperties.setModel("gemini-1.5-flash");
        aiProperties.setEndpoint("https://generativelanguage.googleapis.com/v1beta");

        // Simulate AI Provider error (e.g. 503 Service Unavailable / Rate Limit)
        mockServer.expect(requestTo(org.hamcrest.Matchers.startsWith("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent")))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        AiAssistantRequestDto req = new AiAssistantRequestDto("How do I stay safe taking an Uber or cab?");
        AiAssistantResponseDto response = service.processUserMessage("test@example.com", req);

        mockServer.verify();
        assertFalse(response.isEmergency());
        assertEquals("VERIFIED_KNOWLEDGE_BASE_FALLBACK", response.source());
        assertTrue(response.reply().contains("Verify Vehicle Details"));
        assertTrue(response.reply().contains("Sit in the Rear Seat"));
    }

    @Test
    @DisplayName("Provides contextual grounded guidance for digital safety and online privacy")
    void shouldProvideDigitalSafetyGuidance() {
        aiProperties.setEnabled(false);

        AiAssistantRequestDto req = new AiAssistantRequestDto("What are safe tips for social media privacy and online check-ins?");
        AiAssistantResponseDto response = service.processUserMessage("test@example.com", req);

        assertEquals("VERIFIED_KNOWLEDGE_BASE_FALLBACK", response.source());
        assertTrue(response.reply().contains("Delay Location Sharing"));
        assertTrue(response.reply().contains("1930"));
        assertTrue(response.suggestedHelplines().stream().anyMatch(h -> h.contains("1930")));
    }

    @Test
    @DisplayName("Enforces rate limiting after 15 requests in a 1-minute window")
    void shouldEnforceRateLimiting() {
        aiProperties.setEnabled(false);
        AiAssistantRequestDto req = new AiAssistantRequestDto("General tips");

        for (int i = 0; i < 15; i++) {
            service.processUserMessage("rate_limited_user@example.com", req);
        }

        assertThrows(RateLimitExceededException.class, () ->
                service.processUserMessage("rate_limited_user@example.com", req)
        );
    }
}
