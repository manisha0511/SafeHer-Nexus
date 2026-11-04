package com.safehernexus.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.dto.contact.EmergencyContactRequestDto;
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

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmergencyContactControllerIntegrationTest {

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
    @DisplayName("Creates, lists, updates, and deletes emergency contacts for the authenticated user")
    void shouldCreateListUpdateAndDeleteContacts() throws Exception {
        String token = registerAndGetToken("Divya Menon", "divya@example.com");

        // 1. Create first contact (Primary)
        EmergencyContactRequestDto createReq = new EmergencyContactRequestDto(
                "Sunita Menon",
                "+91 9876543210",
                "Mother",
                "sunita@example.com",
                true
        );

        MvcResult createRes = mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Sunita Menon"))
                .andExpect(jsonPath("$.phoneNumber").value("+91 9876543210"))
                .andExpect(jsonPath("$.relationship").value("Mother"))
                .andExpect(jsonPath("$.email").value("sunita@example.com"))
                .andExpect(jsonPath("$.primaryContact").value(true))
                .andReturn();

        Long contactId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("id").asLong();

        // 2. Update contact
        EmergencyContactRequestDto updateReq = new EmergencyContactRequestDto(
                "Sunita M. Menon",
                "+91 9876543211",
                "Parent",
                "sunita.updated@example.com",
                true
        );

        mockMvc.perform(put("/api/emergency-contacts/" + contactId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Sunita M. Menon"))
                .andExpect(jsonPath("$.phoneNumber").value("+91 9876543211"))
                .andExpect(jsonPath("$.relationship").value("Parent"))
                .andExpect(jsonPath("$.email").value("sunita.updated@example.com"));

        // 3. List contacts
        mockMvc.perform(get("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(contactId));

        // 4. Delete contact
        mockMvc.perform(delete("/api/emergency-contacts/" + contactId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        // 5. Verify list is now empty
        mockMvc.perform(get("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Prevents user B from viewing, updating, or deleting user A's emergency contacts")
    void shouldEnforceStrictContactOwnershipBetweenUsers() throws Exception {
        String tokenUserA = registerAndGetToken("User A", "usera@example.com");
        String tokenUserB = registerAndGetToken("User B", "userb@example.com");

        EmergencyContactRequestDto userAContact = new EmergencyContactRequestDto(
                "Asha Sister",
                "+91 9111222333",
                "Sister",
                "asha@example.com",
                true
        );

        MvcResult createRes = mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userAContact)))
                .andExpect(status().isCreated())
                .andReturn();

        Long userAContactId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("id").asLong();

        // User B lists contacts -> sees 0 contacts
        mockMvc.perform(get("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // User B attempts to update User A's contact -> 404 Not Found
        EmergencyContactRequestDto hijackReq = new EmergencyContactRequestDto(
                "Hijacked Name",
                "+91 9999888777",
                "Friend",
                null,
                false
        );

        mockMvc.perform(put("/api/emergency-contacts/" + userAContactId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hijackReq)))
                .andExpect(status().isNotFound());

        // User B attempts to delete User A's contact -> 404 Not Found
        mockMvc.perform(delete("/api/emergency-contacts/" + userAContactId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserB))
                .andExpect(status().isNotFound());

        // User A's contact is still intact
        mockMvc.perform(get("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Asha Sister"));
    }

    @Test
    @DisplayName("Rejects duplicate phone numbers (even formatted differently) and enforces max 5 contacts per user")
    void shouldPreventDuplicateContactsAndEnforceMaxLimit() throws Exception {
        String token = registerAndGetToken("Pooja Joshi", "pooja@example.com");

        EmergencyContactRequestDto first = new EmergencyContactRequestDto(
                "Contact 1",
                "+91-98765-00001",
                "Friend",
                "c1@example.com",
                true
        );

        mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(first)))
                .andExpect(status().isCreated());

        // Attempt duplicate phone with spaces instead of hyphens -> 409 Conflict
        EmergencyContactRequestDto duplicatePhone = new EmergencyContactRequestDto(
                "Contact Duplicate",
                "+91 98765 00001",
                "Colleague",
                "other@example.com",
                false
        );

        mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicatePhone)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        // Add contacts 2, 3, 4, 5 (reaching the max limit of 5)
        for (int i = 2; i <= 5; i++) {
            EmergencyContactRequestDto nextContact = new EmergencyContactRequestDto(
                    "Contact " + i,
                    "+91987650000" + i,
                    "Family",
                    "c" + i + "@example.com",
                    false
            );
            mockMvc.perform(post("/api/emergency-contacts")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(nextContact)))
                    .andExpect(status().isCreated());
        }

        // Attempt to add a 6th contact -> 400 Bad Request
        EmergencyContactRequestDto sixthContact = new EmergencyContactRequestDto(
                "Contact 6",
                "+919876500006",
                "Neighbor",
                "c6@example.com",
                false
        );

        mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sixthContact)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Maximum limit of 5 trusted emergency contacts reached"));
    }

    @Test
    @DisplayName("Validates invalid contact input with 400 Bad Request and field errors")
    void shouldRejectInvalidContactInputs() throws Exception {
        String token = registerAndGetToken("Sneha Iyer", "sneha@example.com");

        EmergencyContactRequestDto invalidReq = new EmergencyContactRequestDto(
                "",
                "bad-phone",
                "",
                "not-an-email",
                false
        );

        mockMvc.perform(post("/api/emergency-contacts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.name").exists())
                .andExpect(jsonPath("$.validationErrors.phoneNumber").exists())
                .andExpect(jsonPath("$.validationErrors.relationship").exists())
                .andExpect(jsonPath("$.validationErrors.email").exists());
    }
}
