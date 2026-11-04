package com.safehernexus.backend.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.dto.contact.EmergencyContactRequestDto;
import com.safehernexus.backend.dto.event.CreateSosEventRequestDto;
import com.safehernexus.backend.dto.event.RecordLocationUpdateRequestDto;
import com.safehernexus.backend.dto.event.ResolveEmergencyEventRequestDto;
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

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityAuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmergencyNotificationRepository emergencyNotificationRepository;

    @Autowired
    private EmergencyEventLocationRepository emergencyEventLocationRepository;

    @Autowired
    private EmergencyContactRepository emergencyContactRepository;

    @Autowired
    private EmergencyEventRepository emergencyEventRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        emergencyNotificationRepository.deleteAll();
        emergencyEventLocationRepository.deleteAll();
        emergencyContactRepository.deleteAll();
        emergencyEventRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String registerAndGetToken(String name, String email) throws Exception {
        RegisterRequestDto req = new RegisterRequestDto(name, email, "SecurityPass#2026");
        MvcResult res = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        return root.get("accessToken").asText();
    }

    @Test
    @DisplayName("Security: Enforce strict multi-tenant isolation - User B cannot view User A's SOS event")
    void shouldRejectCrossUserAccessToEmergencyEvent() throws Exception {
        String tokenA = registerAndGetToken("User A", "usera@example.com");
        String tokenB = registerAndGetToken("User B", "userb@example.com");

        // User A creates SOS event
        CreateSosEventRequestDto sosReq = new CreateSosEventRequestDto(12.9716, 77.5946, 10.0, Instant.now(), "Metro", "Help");
        MvcResult sosRes = mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sosReq)))
                .andExpect(status().isCreated())
                .andReturn();
        long eventIdA = objectMapper.readTree(sosRes.getResponse().getContentAsString()).get("id").asLong();

        // User B attempts to access User A's event
        mockMvc.perform(get("/api/emergency-events/" + eventIdA)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Security: Enforce strict multi-tenant isolation - User B cannot resolve User A's SOS event")
    void shouldRejectCrossUserResolutionOfEmergencyEvent() throws Exception {
        String tokenA = registerAndGetToken("User A", "usera@example.com");
        String tokenB = registerAndGetToken("User B", "userb@example.com");

        // User A creates SOS event
        CreateSosEventRequestDto sosReq = new CreateSosEventRequestDto(12.9716, 77.5946, null, null, null, null);
        MvcResult sosRes = mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sosReq)))
                .andExpect(status().isCreated())
                .andReturn();
        long eventIdA = objectMapper.readTree(sosRes.getResponse().getContentAsString()).get("id").asLong();

        // User B attempts to resolve User A's event
        ResolveEmergencyEventRequestDto resolveReq = new ResolveEmergencyEventRequestDto("Trying to resolve as attacker");
        mockMvc.perform(post("/api/emergency-events/" + eventIdA + "/resolve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolveReq)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Security: Enforce strict multi-tenant isolation - User B cannot upload breadcrumb to User A's event")
    void shouldRejectCrossUserLocationBreadcrumbUpload() throws Exception {
        String tokenA = registerAndGetToken("User A", "usera@example.com");
        String tokenB = registerAndGetToken("User B", "userb@example.com");

        // User A creates SOS event
        CreateSosEventRequestDto sosReq = new CreateSosEventRequestDto(12.9716, 77.5946, null, null, null, null);
        MvcResult sosRes = mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sosReq)))
                .andExpect(status().isCreated())
                .andReturn();
        long eventIdA = objectMapper.readTree(sosRes.getResponse().getContentAsString()).get("id").asLong();

        // User B attempts to push a fake location breadcrumb to User A's event
        RecordLocationUpdateRequestDto locReq = new RecordLocationUpdateRequestDto(
                12.9800, 77.6000, 5.0, 100.0, 1.2, 90.0, Instant.now()
        );
        mockMvc.perform(post("/api/emergency-events/" + eventIdA + "/locations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(locReq)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Security: Enforce strict multi-tenant isolation - User B cannot modify or delete User A's emergency contact")
    void shouldRejectCrossUserEmergencyContactTampering() throws Exception {
        String tokenA = registerAndGetToken("User A", "usera@example.com");
        String tokenB = registerAndGetToken("User B", "userb@example.com");

        // User A creates a trusted contact
        EmergencyContactRequestDto contactReq = new EmergencyContactRequestDto(
                "Brother", "+919876543210", "Brother", "brother@example.com", true
        );
        MvcResult contactRes = mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(contactReq)))
                .andExpect(status().isCreated())
                .andReturn();
        long contactIdA = objectMapper.readTree(contactRes.getResponse().getContentAsString()).get("id").asLong();

        // User B attempts to modify User A's contact
        EmergencyContactRequestDto updateReq = new EmergencyContactRequestDto(
                "Hacked", "+919999999999", "Attacker", "hacked@example.com", false
        );
        mockMvc.perform(put("/api/emergency-contacts/" + contactIdA)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isNotFound());

        // User B attempts to delete User A's contact
        mockMvc.perform(delete("/api/emergency-contacts/" + contactIdA)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Security: Reject tampered JWT token signature")
    void shouldRejectTamperedJwt() throws Exception {
        String validToken = registerAndGetToken("User Secure", "secure@example.com");
        // Tamper with the signature portion of the token
        String tamperedToken = validToken.substring(0, validToken.length() - 5) + "ABCDE";

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tamperedToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security: Verify production security headers (X-Frame-Options, X-Content-Type-Options)")
    void shouldIncludeSecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }
}
