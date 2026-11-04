package com.safehernexus.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.dto.profile.UpdateUserProfileRequestDto;
import com.safehernexus.backend.repository.EmergencyContactRepository;
import com.safehernexus.backend.repository.EmergencyEventRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserProfileControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmergencyContactRepository emergencyContactRepository;

    @Autowired
    private EmergencyEventRepository emergencyEventRepository;

    @Autowired
    private com.safehernexus.backend.repository.EmergencyEventLocationRepository emergencyEventLocationRepository;

    @Autowired
    private com.safehernexus.backend.repository.EmergencyNotificationRepository emergencyNotificationRepository;

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
    @DisplayName("GET /api/users/me and PUT /api/users/me view and update only the authenticated user's profile")
    void shouldViewAndUpdateAuthenticatedUserProfileOnly() throws Exception {
        String tokenAlice = registerAndGetToken("Alice Rao", "alice@example.com");
        String tokenBob = registerAndGetToken("Bob Kumar", "bob@example.com");

        // Alice views her initial profile
        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenAlice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice Rao"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        // Alice updates her profile
        UpdateUserProfileRequestDto updateReq = new UpdateUserProfileRequestDto(
                "Alice Rao Updated",
                "+91 9876543210",
                "Allergic to penicillin; notify sister first."
        );

        mockMvc.perform(put("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenAlice)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice Rao Updated"))
                .andExpect(jsonPath("$.phoneNumber").value("+91 9876543210"))
                .andExpect(jsonPath("$.safetyNote").value("Allergic to penicillin; notify sister first."));

        // Verify Bob's profile remains completely untouched
        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenBob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Bob Kumar"))
                .andExpect(jsonPath("$.email").value("bob@example.com"))
                .andExpect(jsonPath("$.phoneNumber").isEmpty());
    }

    @Test
    @DisplayName("PUT /api/users/me rejects invalid name or phone number with 400 Bad Request")
    void shouldValidateProfileUpdateInputs() throws Exception {
        String token = registerAndGetToken("Alice Rao", "alice@example.com");

        UpdateUserProfileRequestDto invalidUpdate = new UpdateUserProfileRequestDto(
                "",
                "invalid-phone-###",
                "Valid safety note"
        );

        mockMvc.perform(put("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidUpdate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.name").exists())
                .andExpect(jsonPath("$.validationErrors.phoneNumber").exists());
    }

    @Test
    @DisplayName("GET and PUT /api/users/me reject unauthenticated access with 401 Unauthorized")
    void shouldRejectUnauthenticatedProfileAccess() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());

        UpdateUserProfileRequestDto req = new UpdateUserProfileRequestDto("Name", "+919876543210", null);
        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }
}
