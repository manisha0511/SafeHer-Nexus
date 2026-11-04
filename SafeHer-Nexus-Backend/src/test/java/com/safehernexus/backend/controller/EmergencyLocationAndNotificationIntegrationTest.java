package com.safehernexus.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.dto.contact.EmergencyContactRequestDto;
import com.safehernexus.backend.dto.event.CreateSosEventRequestDto;
import com.safehernexus.backend.dto.event.RecordLocationUpdateRequestDto;
import com.safehernexus.backend.dto.event.ResolveEmergencyEventRequestDto;
import com.safehernexus.backend.entity.EmergencyEvent;
import com.safehernexus.backend.entity.EmergencyNotification;
import com.safehernexus.backend.entity.NotificationDeliveryStatus;
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

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmergencyLocationAndNotificationIntegrationTest {

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

    private Long createSosEvent(String token, Double lat, Double lon) throws Exception {
        CreateSosEventRequestDto req = new CreateSosEventRequestDto(
                lat,
                lon,
                15.0,
                Instant.now(),
                "MG Road, Bengaluru",
                "Late night commute assistance needed"
        );

        MvcResult res = mockMvc.perform(post("/api/emergency-events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        return root.get("id").asLong();
    }

    @Test
    @DisplayName("POST /api/emergency-events/{id}/locations records live location updates for active SOS")
    void shouldRecordLocationUpdateForActiveSos() throws Exception {
        String token = registerAndGetToken("Pooja Sharma", "pooja@example.com");
        Long eventId = createSosEvent(token, 12.9716, 77.5946);

        RecordLocationUpdateRequestDto updateReq = new RecordLocationUpdateRequestDto(
                12.9750,
                77.5980,
                8.5,
                920.0,
                4.2,
                45.0,
                Instant.now()
        );

        mockMvc.perform(post("/api/emergency-events/" + eventId + "/locations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.emergencyEventId").value(eventId))
                .andExpect(jsonPath("$.latitude").value(12.9750))
                .andExpect(jsonPath("$.longitude").value(77.5980))
                .andExpect(jsonPath("$.accuracyMeters").value(8.5))
                .andExpect(jsonPath("$.speedMps").value(4.2));

        // Verify GET /api/emergency-events/{id}/locations returns the location trail
        mockMvc.perform(get("/api/emergency-events/" + eventId + "/locations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].latitude").value(12.9750));
    }

    @Test
    @DisplayName("POST /api/emergency-events/{id}/locations rejects updates when event is RESOLVED")
    void shouldRejectLocationUpdateWhenEventIsResolved() throws Exception {
        String token = registerAndGetToken("Sneha Patil", "sneha@example.com");
        Long eventId = createSosEvent(token, 18.5204, 73.8567);

        // Resolve the event
        ResolveEmergencyEventRequestDto resolveReq = new ResolveEmergencyEventRequestDto("Reached home safely");
        mockMvc.perform(post("/api/emergency-events/" + eventId + "/resolve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        // Attempting to post location update to resolved event must be rejected
        RecordLocationUpdateRequestDto updateReq = new RecordLocationUpdateRequestDto(
                18.5220,
                73.8580,
                5.0,
                null,
                null,
                null,
                Instant.now()
        );

        mockMvc.perform(post("/api/emergency-events/" + eventId + "/locations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Location updates can only be recorded for an active emergency event (current status: RESOLVED)"));
    }

    @Test
    @DisplayName("POST /api/emergency-events/{id}/locations isolates events across different users")
    void shouldPreventUserFromUpdatingAnotherUsersEvent() throws Exception {
        String userAToken = registerAndGetToken("User A", "userA@example.com");
        String userBToken = registerAndGetToken("User B", "userB@example.com");

        Long eventAId = createSosEvent(userAToken, 13.0827, 80.2707);

        RecordLocationUpdateRequestDto updateReq = new RecordLocationUpdateRequestDto(
                13.0850,
                80.2750,
                10.0,
                null,
                null,
                null,
                Instant.now()
        );

        // User B attempts to write location to User A's event
        mockMvc.perform(post("/api/emergency-events/" + eventAId + "/locations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Emergency event not found"));
    }

    @Test
    @DisplayName("POST /api/emergency-events/{id}/locations rejects invalid coordinates")
    void shouldRejectInvalidCoordinates() throws Exception {
        String token = registerAndGetToken("Ritu Verma", "ritu@example.com");
        Long eventId = createSosEvent(token, 28.7041, 77.1025);

        // Latitude > 90
        RecordLocationUpdateRequestDto badLat = new RecordLocationUpdateRequestDto(
                95.0,
                77.1025,
                10.0,
                null,
                null,
                null,
                Instant.now()
        );
        mockMvc.perform(post("/api/emergency-events/" + eventId + "/locations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLat)))
                .andExpect(status().isBadRequest());

        // Longitude > 180
        RecordLocationUpdateRequestDto badLon = new RecordLocationUpdateRequestDto(
                28.7041,
                195.0,
                10.0,
                null,
                null,
                null,
                Instant.now()
        );
        mockMvc.perform(post("/api/emergency-events/" + eventId + "/locations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLon)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("SOS creation with contacts records NOT_CONFIGURED notifications without failing event when Twilio is disabled")
    void shouldRecordNotConfiguredNotificationsWhenTwilioIsDisabled() throws Exception {
        String token = registerAndGetToken("Kavita Nair", "kavita@example.com");

        // Add 2 emergency contacts
        EmergencyContactRequestDto contact1 = new EmergencyContactRequestDto(
                "Mom",
                "+919876543210",
                "Mother",
                "mom@example.com",
                true
        );
        mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(contact1)))
                .andExpect(status().isCreated());

        EmergencyContactRequestDto contact2 = new EmergencyContactRequestDto(
                "Sister",
                "+919876543211",
                "Sister",
                "sister@example.com",
                false
        );
        mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(contact2)))
                .andExpect(status().isCreated());

        // Trigger SOS event
        Long eventId = createSosEvent(token, 19.0760, 72.8777);

        // Verify notifications list for this event
        mockMvc.perform(get("/api/emergency-events/" + eventId + "/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].status").value("NOT_CONFIGURED"))
                .andExpect(jsonPath("$[1].status").value("NOT_CONFIGURED"));

        // Verify active event response includes notifications array and notificationStatus
        mockMvc.perform(get("/api/emergency-events/active")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notificationStatus").value("NOT_CONFIGURED"))
                .andExpect(jsonPath("$.notifications", hasSize(2)));
    }

    @Test
    @DisplayName("Twilio callback updates notification status from SENT to DELIVERED")
    void shouldUpdateNotificationStatusOnTwilioCallback() throws Exception {
        String token = registerAndGetToken("Ananya Sen", "ananya@example.com");
        Long eventId = createSosEvent(token, 22.5726, 88.3639);

        EmergencyEvent event = emergencyEventRepository.findById(eventId).orElseThrow();

        // Simulate pre-existing SENT notification with Twilio message SID
        EmergencyNotification notif = new EmergencyNotification(
                event,
                null,
                "+919876543210",
                "Mom",
                "EMERGENCY ALERT: Ananya triggered SOS",
                NotificationDeliveryStatus.SENT
        );
        notif.setProviderMessageId("SM_test_webhook_12345");
        notif.setSentAt(Instant.now());
        emergencyNotificationRepository.save(notif);

        // Simulate Twilio delivery receipt webhook callback
        mockMvc.perform(post("/api/emergency-events/notifications/twilio-callback")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("MessageSid", "SM_test_webhook_12345")
                        .param("MessageStatus", "delivered"))
                .andExpect(status().isOk());

        EmergencyNotification updated = emergencyNotificationRepository
                .findByProviderMessageId("SM_test_webhook_12345")
                .orElseThrow();

        assertEquals(NotificationDeliveryStatus.DELIVERED, updated.getStatus());
        assertNotNull(updated.getDeliveredAt());
    }
}
