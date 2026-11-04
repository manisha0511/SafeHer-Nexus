package com.safehernexus.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.dto.event.CreateSosEventRequestDto;
import com.safehernexus.backend.dto.event.ResolveEmergencyEventRequestDto;
import com.safehernexus.backend.entity.EmergencyEvent;
import com.safehernexus.backend.entity.EmergencyEventStatus;
import com.safehernexus.backend.entity.EmergencyEventType;
import com.safehernexus.backend.entity.User;
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
import java.time.temporal.ChronoUnit;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmergencyEventControllerIntegrationTest {

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
    private EmergencyEventLocationRepository emergencyEventLocationRepository;

    @Autowired
    private EmergencyNotificationRepository emergencyNotificationRepository;

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
    @DisplayName("GET /api/emergency-events returns empty content list when user has no history")
    void shouldReturnEmptyHistoryForNewUser() throws Exception {
        String token = registerAndGetToken("Aditi Rao", "aditi@example.com");

        mockMvc.perform(get("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.last").value(true));

        // Also verify /api/emergency-events/active returns 204 No Content when no active event exists
        mockMvc.perform(get("/api/emergency-events/active")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("POST /api/emergency-events creates SOS event with coordinates and honest NOT_CONFIGURED notification status")
    void shouldCreateSosEventWithCoordinates() throws Exception {
        String token = registerAndGetToken("Nandini Roy", "nandini@example.com");
        Instant capturedAt = Instant.now().minus(5, ChronoUnit.SECONDS);

        CreateSosEventRequestDto sosRequest = new CreateSosEventRequestDto(
                12.9716,
                77.5946,
                14.5,
                capturedAt,
                "Near MG Road Metro",
                "Triggered SOS during late commute"
        );

        mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sosRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.eventType").value("SOS_ALERT"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.notificationStatus").value("NOT_CONFIGURED"))
                .andExpect(jsonPath("$.notificationStatusMessage").isNotEmpty())
                .andExpect(jsonPath("$.locationAttached").value(true))
                .andExpect(jsonPath("$.initialLatitude").value(12.9716))
                .andExpect(jsonPath("$.initialLongitude").value(77.5946))
                .andExpect(jsonPath("$.locationAccuracyMeters").value(14.5))
                .andExpect(jsonPath("$.locationCapturedAt").isNotEmpty())
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.resolvedAt").isEmpty());

        // Verify GET /api/emergency-events/active returns this active event
        mockMvc.perform(get("/api/emergency-events/active")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.locationAttached").value(true));
    }

    @Test
    @DisplayName("POST /api/emergency-events allows creating SOS event without coordinates when location is unavailable")
    void shouldCreateSosEventWithoutCoordinates() throws Exception {
        String token = registerAndGetToken("Tanvi Shah", "tanvi@example.com");

        CreateSosEventRequestDto noLocationRequest = new CreateSosEventRequestDto(
                null,
                null,
                null,
                null,
                null,
                "Location permission denied; proceeding with SOS"
        );

        mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noLocationRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.locationAttached").value(false))
                .andExpect(jsonPath("$.initialLatitude").isEmpty())
                .andExpect(jsonPath("$.initialLongitude").isEmpty())
                .andExpect(jsonPath("$.notificationStatus").value("NOT_CONFIGURED"));
    }

    @Test
    @DisplayName("POST /api/emergency-events rejects out-of-range or partial coordinates with 400 Bad Request")
    void shouldRejectInvalidOrPartialCoordinates() throws Exception {
        String token = registerAndGetToken("Zoya Khan", "zoya@example.com");

        // 1. Out-of-range latitude (> 90) and longitude (> 180)
        CreateSosEventRequestDto outOfRangeReq = new CreateSosEventRequestDto(
                105.0,
                210.0,
                -5.0,
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(outOfRangeReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.latitude").exists())
                .andExpect(jsonPath("$.validationErrors.longitude").exists())
                .andExpect(jsonPath("$.validationErrors.locationAccuracyMeters").exists());

        // 2. Partial coordinates (latitude provided without longitude)
        CreateSosEventRequestDto partialCoordsReq = new CreateSosEventRequestDto(
                12.9716,
                null,
                null,
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partialCoordsReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(
                        "Both latitude and longitude must be provided together when attaching location"
                ));
    }

    @Test
    @DisplayName("Prevents duplicate active SOS events (409 Conflict) and resolves active event while preserving history")
    void shouldPreventDuplicateActiveSosAndResolvePreservingHistory() throws Exception {
        String token = registerAndGetToken("Ishita Bose", "ishita@example.com");

        CreateSosEventRequestDto firstSos = new CreateSosEventRequestDto(
                28.6139,
                77.2090,
                10.0,
                Instant.now(),
                "Connaught Place",
                "Initial SOS"
        );

        MvcResult createRes = mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstSos)))
                .andExpect(status().isCreated())
                .andReturn();

        Long eventId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("id").asLong();

        // Repeated activation while first event is still ACTIVE -> 409 Conflict
        mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstSos)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        // Resolve the active SOS event
        ResolveEmergencyEventRequestDto resolveReq = new ResolveEmergencyEventRequestDto(
                "Reached home safely."
        );

        mockMvc.perform(post("/api/emergency-events/" + eventId + "/resolve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(eventId))
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());

        // Attempting to resolve an already resolved event -> 400 Bad Request
        mockMvc.perform(post("/api/emergency-events/" + eventId + "/resolve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolveReq)))
                .andExpect(status().isBadRequest());

        // Verify /api/emergency-events/active now returns 204 No Content
        mockMvc.perform(get("/api/emergency-events/active")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        // Verify the resolved event is still persisted in emergency history!
        mockMvc.perform(get("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(eventId))
                .andExpect(jsonPath("$.content[0].status").value("RESOLVED"));
    }

    @Test
    @DisplayName("Enforces strict event ownership on GET, active lookup, and resolve endpoints")
    void shouldEnforceOwnershipOnSosReadAndResolve() throws Exception {
        String tokenUserA = registerAndGetToken("User A", "usera@example.com");
        String tokenUserB = registerAndGetToken("User B", "userb@example.com");

        CreateSosEventRequestDto sosReq = new CreateSosEventRequestDto(
                19.0760,
                72.8777,
                12.0,
                Instant.now(),
                "Bandra Station",
                null
        );

        MvcResult createRes = mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sosReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long userAEventId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("id").asLong();

        // User B cannot view User A's active event via /active (gets 204 No Content)
        mockMvc.perform(get("/api/emergency-events/active")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserB))
                .andExpect(status().isNoContent());

        // User B cannot fetch User A's event by ID -> 404 Not Found
        mockMvc.perform(get("/api/emergency-events/" + userAEventId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserB))
                .andExpect(status().isNotFound());

        // User B cannot resolve User A's active event -> 404 Not Found
        mockMvc.perform(post("/api/emergency-events/" + userAEventId + "/resolve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/emergency-events paginates newest events first")
    void shouldPaginateNewestFirst() throws Exception {
        String tokenUserA = registerAndGetToken("User A", "usera.page@example.com");
        User userA = userRepository.findByEmailIgnoreCase("usera.page@example.com").orElseThrow();

        Instant baseTime = Instant.now().minus(3, ChronoUnit.DAYS);

        EmergencyEvent oldestEvent = emergencyEventRepository.save(new EmergencyEvent(
                userA,
                EmergencyEventType.SAFETY_CHECK_IN,
                EmergencyEventStatus.RESOLVED,
                "Indiranagar Metro Station",
                "Routine evening check-in",
                baseTime,
                baseTime.plus(15, ChronoUnit.MINUTES)
        ));

        EmergencyEvent middleEvent = emergencyEventRepository.save(new EmergencyEvent(
                userA,
                EmergencyEventType.LOCATION_SHARE,
                EmergencyEventStatus.RESOLVED,
                "MG Road Area",
                "Shared commute with trusted contact",
                baseTime.plus(1, ChronoUnit.DAYS),
                baseTime.plus(1, ChronoUnit.DAYS).plus(30, ChronoUnit.MINUTES)
        ));

        EmergencyEvent newestEvent = emergencyEventRepository.save(new EmergencyEvent(
                userA,
                EmergencyEventType.SOS_ALERT,
                EmergencyEventStatus.RESOLVED,
                "Koramangala Block 4",
                "Resolved safely",
                baseTime.plus(2, ChronoUnit.DAYS),
                baseTime.plus(2, ChronoUnit.DAYS).plus(20, ChronoUnit.MINUTES)
        ));

        mockMvc.perform(get("/api/emergency-events")
                        .param("page", "0")
                        .param("size", "2")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.last").value(false))
                .andExpect(jsonPath("$.content[0].id").value(newestEvent.getId()))
                .andExpect(jsonPath("$.content[1].id").value(middleEvent.getId()));

        mockMvc.perform(get("/api/emergency-events")
                        .param("page", "1")
                        .param("size", "2")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.last").value(true))
                .andExpect(jsonPath("$.content[0].id").value(oldestEvent.getId()));
    }

    @Test
    @DisplayName("Rejects unauthenticated requests to SOS and emergency event endpoints with 401 Unauthorized")
    void shouldRejectUnauthenticatedEmergencyRequests() throws Exception {
        mockMvc.perform(get("/api/emergency-events"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/emergency-events/active"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/emergency-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/emergency-events/1/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
