package com.safehernexus.backend.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SafetyTipControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/safety-tips returns all safety guidance publicly without authentication")
    void shouldReturnAllSafetyTipsPublicly() throws Exception {
        mockMvc.perform(get("/api/safety-tips"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(10))))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].title").isNotEmpty())
                .andExpect(jsonPath("$[0].content").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/safety-tips?category=TRAVEL filters by TRAVEL category")
    void shouldFilterSafetyTipsByCategory() throws Exception {
        mockMvc.perform(get("/api/safety-tips").param("category", "TRAVEL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$[0].category").value("TRAVEL"))
                .andExpect(jsonPath("$[1].category").value("TRAVEL"));
    }

    @Test
    @DisplayName("GET /api/safety-tips/helplines returns verified emergency helplines publicly")
    void shouldReturnEmergencyHelplinesPublicly() throws Exception {
        mockMvc.perform(get("/api/safety-tips/helplines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].helpline").value(true))
                .andExpect(jsonPath("$[0].emergencyNumber").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/safety-tips?category=INVALID returns 400 Bad Request")
    void shouldReturnBadRequestForInvalidCategory() throws Exception {
        mockMvc.perform(get("/api/safety-tips").param("category", "INVALID_CAT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
