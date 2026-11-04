package com.safehernexus.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.dto.ai.AiAssistantRequestDto;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.repository.EmergencyContactRepository;
import com.safehernexus.backend.repository.EmergencyEventLocationRepository;
import com.safehernexus.backend.repository.EmergencyEventRepository;
import com.safehernexus.backend.repository.EmergencyNotificationRepository;
import com.safehernexus.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiAssistantControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmergencyEventRepository emergencyEventRepository;

    @Autowired
    private EmergencyEventLocationRepository emergencyEventLocationRepository;

    @Autowired
    private EmergencyNotificationRepository emergencyNotificationRepository;

    @Autowired
    private EmergencyContactRepository emergencyContactRepository;

    @BeforeEach
    void setUp() {
        emergencyNotificationRepository.deleteAll();
        emergencyEventLocationRepository.deleteAll();
        emergencyContactRepository.deleteAll();
        emergencyEventRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String registerAndGetToken(String name, String email) throws Exception {
        RegisterRequestDto req = new RegisterRequestDto(name, email, "StrongPass#2026");
        MvcResult res = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        return root.get("accessToken").asText();
    }

    @Test
    @DisplayName("POST /api/ai/assistant/chat without auth returns 401 Unauthorized")
    void shouldReturn401WithoutAuth() throws Exception {
        AiAssistantRequestDto req = new AiAssistantRequestDto("How do I stay safe on the metro?");
        mockMvc.perform(post("/api/ai/assistant/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/ai/assistant/chat with blank message returns 400 Bad Request")
    void shouldRejectBlankMessage() throws Exception {
        String token = registerAndGetToken("Rhea Sharma", "rhea@example.com");
        AiAssistantRequestDto req = new AiAssistantRequestDto("   ");

        mockMvc.perform(post("/api/ai/assistant/chat")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/ai/assistant/chat returns grounded safety guidance with verified helplines and disclaimer")
    void shouldReturnGroundedSafetyGuidance() throws Exception {
        String token = registerAndGetToken("Pooja Verma", "pooja@example.com");
        AiAssistantRequestDto req = new AiAssistantRequestDto("What are some tips for travelling alone on public transport?");

        mockMvc.perform(post("/api/ai/assistant/chat")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").isNotEmpty())
                .andExpect(jsonPath("$.disclaimer").isNotEmpty())
                .andExpect(jsonPath("$.isEmergency").value(false))
                .andExpect(jsonPath("$.suggestedHelplines", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$.suggestedHelplines[0]", containsString("112")));
    }

    @Test
    @DisplayName("POST /api/ai/assistant/chat intercepts imminent danger and triggers EMERGENCY_OVERRIDE")
    void shouldInterceptImminentDangerAndTriggerEmergencyOverride() throws Exception {
        String token = registerAndGetToken("Kavita Nair", "kavita@example.com");
        AiAssistantRequestDto req = new AiAssistantRequestDto("Someone is following me down the street, help me!");

        mockMvc.perform(post("/api/ai/assistant/chat")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isEmergency").value(true))
                .andExpect(jsonPath("$.emergencyActionRecommended").isNotEmpty())
                .andExpect(jsonPath("$.source").value("EMERGENCY_OVERRIDE"))
                .andExpect(jsonPath("$.reply", containsString("112")))
                .andExpect(jsonPath("$.reply", containsString("SOS")));
    }

    @Test
    @DisplayName("POST /api/ai/assistant/chat enforces rate limiting after exceeding 15 requests/min")
    void shouldEnforceRateLimitPerUser() throws Exception {
        String token = registerAndGetToken("Tara Sen", "tara@example.com");
        AiAssistantRequestDto req = new AiAssistantRequestDto("General safety tips");

        // Send 15 valid requests
        for (int i = 0; i < 15; i++) {
            mockMvc.perform(post("/api/ai/assistant/chat")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk());
        }

        // 16th request must trigger rate limiting (HTTP 429 Too Many Requests)
        mockMvc.perform(post("/api/ai/assistant/chat")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message", containsString("Rate limit reached")));
    }
}
