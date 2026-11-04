package com.safehernexus.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.dto.route.RouteRecommendationRequestDto;
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
class RouteControllerIntegrationTest {

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
    @DisplayName("POST /api/routes/recommendations without auth returns 401 Unauthorized")
    void shouldReturn401WithoutAuth() throws Exception {
        RouteRecommendationRequestDto req = new RouteRecommendationRequestDto(
                "Connaught Place",
                "India Gate",
                null, null, null, null,
                "DRIVING"
        );

        mockMvc.perform(post("/api/routes/recommendations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/routes/recommendations with blank destination returns 400 Bad Request")
    void shouldRejectBlankDestination() throws Exception {
        String token = registerAndGetToken("Shalini Gupta", "shalini@example.com");
        RouteRecommendationRequestDto req = new RouteRecommendationRequestDto(
                "Connaught Place",
                "   ",
                null, null, null, null,
                "DRIVING"
        );

        mockMvc.perform(post("/api/routes/recommendations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/routes/recommendations with text origin and destination returns arterial corridor guidance and disclaimers")
    void shouldReturnGuidanceForTextAddresses() throws Exception {
        String token = registerAndGetToken("Meera Das", "meera@example.com");
        RouteRecommendationRequestDto req = new RouteRecommendationRequestDto(
                "City Center Metro",
                "Tech Park Campus",
                null, null, null, null,
                "WALKING"
        );

        mockMvc.perform(post("/api/routes/recommendations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.origin").value("City Center Metro"))
                .andExpect(jsonPath("$.destination").value("Tech Park Campus"))
                .andExpect(jsonPath("$.travelMode").value("WALKING"))
                .andExpect(jsonPath("$.routes", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.routes[0].recommended").value(true))
                .andExpect(jsonPath("$.routes[0].googleMapsNavigationUrl", containsString("google.com/maps")))
                .andExpect(jsonPath("$.routes[0].safetyPrecautions", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$.disclaimer", containsString("SafeHer does not guarantee absolute safety")))
                .andExpect(jsonPath("$.emergencyHelplines['National Emergency']").value("112"));
    }

    @Test
    @DisplayName("POST /api/routes/recommendations with GPS coordinates returns route alternatives, steps and precautions")
    void shouldReturnRouteWithCoordinates() throws Exception {
        String token = registerAndGetToken("Ananya Iyer", "ananya@example.com");
        RouteRecommendationRequestDto req = new RouteRecommendationRequestDto(
                "Connaught Place",
                "India Gate",
                28.6315, 77.2167,
                28.6129, 77.2295,
                "DRIVING"
        );

        mockMvc.perform(post("/api/routes/recommendations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routes", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.routes[0].recommended").value(true))
                .andExpect(jsonPath("$.routes[0].distanceMeters", greaterThanOrEqualTo(0.0)))
                .andExpect(jsonPath("$.routes[0].steps", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.routes[0].googleMapsNavigationUrl", containsString("google.com/maps")))
                .andExpect(jsonPath("$.disclaimer").isNotEmpty())
                .andExpect(jsonPath("$.emergencyHelplines['Women Helpline (All India)']").value("1091"));
    }
}
