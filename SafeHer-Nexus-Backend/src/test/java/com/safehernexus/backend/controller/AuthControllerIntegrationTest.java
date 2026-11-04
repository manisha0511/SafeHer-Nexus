package com.safehernexus.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.dto.auth.LoginRequestDto;
import com.safehernexus.backend.dto.auth.RegisterRequestDto;
import com.safehernexus.backend.entity.User;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

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

    @Test
    @DisplayName("POST /api/auth/register creates a new user with BCrypt password hash and returns JWT")
    void shouldRegisterUserSuccessfully() throws Exception {
        RegisterRequestDto request = new RegisterRequestDto(
                "Ananya Sharma",
                "Ananya.Sharma@example.com",
                "SafePass#2026"
        );

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.user.name").value("Ananya Sharma"))
                .andExpect(jsonPath("$.user.email").value("ananya.sharma@example.com"))
                .andExpect(jsonPath("$.user.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.user.password").doesNotExist())
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).doesNotContain("SafePass#2026");

        User savedUser = userRepository.findByEmailIgnoreCase("ananya.sharma@example.com").orElseThrow();
        assertThat(savedUser.getPasswordHash()).isNotEqualTo("SafePass#2026");
        assertThat(savedUser.getPasswordHash()).startsWith("$2a$");
    }

    @Test
    @DisplayName("POST /api/auth/register rejects duplicate email (case-insensitive) with 409 Conflict")
    void shouldRejectDuplicateEmailRegistration() throws Exception {
        RegisterRequestDto firstRequest = new RegisterRequestDto(
                "Priya Verma",
                "priya@example.com",
                "SecurePass123!"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstRequest)))
                .andExpect(status().isCreated());

        RegisterRequestDto duplicateRequest = new RegisterRequestDto(
                "Priya Duplicate",
                "PRIYA@EXAMPLE.COM",
                "AnotherPass456!"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("An account with this email address already exists"));
    }

    @Test
    @DisplayName("POST /api/auth/login returns JWT and safe user profile for valid credentials")
    void shouldLoginSuccessfully() throws Exception {
        RegisterRequestDto registerRequest = new RegisterRequestDto(
                "Meera Nair",
                "meera@example.com",
                "CorrectHorseBattery1!"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        LoginRequestDto loginRequest = new LoginRequestDto(
                "meera@example.com",
                "CorrectHorseBattery1!"
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("meera@example.com"))
                .andExpect(jsonPath("$.user.name").value("Meera Nair"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/auth/login rejects incorrect password with 401 Unauthorized")
    void shouldRejectLoginWithIncorrectPassword() throws Exception {
        RegisterRequestDto registerRequest = new RegisterRequestDto(
                "Kavya Patel",
                "kavya@example.com",
                "MyRealPassword99!"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        LoginRequestDto wrongPasswordLogin = new LoginRequestDto(
                "kavya@example.com",
                "WrongPassword000!"
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongPasswordLogin)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("GET /api/auth/me returns current user profile when valid Bearer JWT is supplied")
    void shouldAllowAccessToMeWithValidToken() throws Exception {
        RegisterRequestDto registerRequest = new RegisterRequestDto(
                "Riya Sen",
                "riya.sen@example.com",
                "StrongSecret#88"
        );

        MvcResult regResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode jsonNode = objectMapper.readTree(regResult.getResponse().getContentAsString());
        String accessToken = jsonNode.get("accessToken").asText();

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("riya.sen@example.com"))
                .andExpect(jsonPath("$.name").value("Riya Sen"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/auth/me rejects unauthenticated request without token with 401 Unauthorized")
    void shouldRejectMeEndpointWithoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("GET /api/auth/me rejects malformed or forged JWT token with 401 Unauthorized")
    void shouldRejectMeEndpointWithMalformedOrTamperedToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer malformed.jwt.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 Bad Request with field errors on invalid input")
    void shouldValidateRegistrationInputs() throws Exception {
        RegisterRequestDto invalidRequest = new RegisterRequestDto(
                "",
                "not-an-email",
                "short"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.name").exists())
                .andExpect(jsonPath("$.validationErrors.email").exists())
                .andExpect(jsonPath("$.validationErrors.password").exists());
    }
}
