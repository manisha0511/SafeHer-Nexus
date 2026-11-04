package com.safehernexus.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.config.TwilioProperties;
import com.safehernexus.backend.entity.NotificationDeliveryStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TwilioSmsServiceUnitTest {

    private TwilioProperties twilioProperties;
    private ObjectMapper objectMapper;
    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private TwilioSmsService twilioSmsService;

    @BeforeEach
    void setUp() {
        twilioProperties = new TwilioProperties();
        objectMapper = new ObjectMapper();
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        twilioSmsService = new TwilioSmsService(twilioProperties, objectMapper, restClientBuilder.build());
    }

    @Test
    @DisplayName("Returns NOT_CONFIGURED when Twilio credentials are disabled or missing")
    void shouldReturnNotConfiguredWhenDisabled() {
        twilioProperties.setEnabled(false);

        TwilioSmsService.SmsDispatchResult result = twilioSmsService.sendSms("+919876543210", "Test Emergency Alert");

        assertEquals(NotificationDeliveryStatus.NOT_CONFIGURED, result.status());
        assertNull(result.providerMessageId());
        assertTrue(result.errorMessage().contains("not configured"));
    }

    @Test
    @DisplayName("Returns FAILED when recipient phone number is blank")
    void shouldReturnFailedWhenPhoneIsBlank() {
        twilioProperties.setEnabled(true);
        twilioProperties.setAccountSid("AC_TEST_ACCOUNT_123");
        twilioProperties.setAuthToken("AUTH_TOKEN_TEST_456");
        twilioProperties.setFromPhoneNumber("+15551234567");

        TwilioSmsService.SmsDispatchResult result = twilioSmsService.sendSms("   ", "Test Emergency Alert");

        assertEquals(NotificationDeliveryStatus.FAILED, result.status());
        assertEquals("Recipient phone number is blank or missing.", result.errorMessage());
    }

    @Test
    @DisplayName("Successfully dispatches SMS via Twilio REST API and parses provider SID")
    void shouldDispatchSmsSuccessfully() {
        twilioProperties.setEnabled(true);
        twilioProperties.setAccountSid("AC_TEST_ACCOUNT_123");
        twilioProperties.setAuthToken("AUTH_TOKEN_TEST_456");
        twilioProperties.setFromPhoneNumber("+15551234567");
        twilioProperties.setStatusCallbackUrl("https://safehernexus.com/api/emergency-events/notifications/twilio-callback");

        String twilioResponseJson = """
                {
                    "sid": "SM998877665544332211",
                    "status": "queued",
                    "to": "+919876543210",
                    "from": "+15551234567",
                    "body": "EMERGENCY ALERT: Test user triggered SOS"
                }
                """;

        mockServer.expect(requestTo("https://api.twilio.com/2010-04-01/Accounts/AC_TEST_ACCOUNT_123/Messages.json"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", org.hamcrest.Matchers.startsWith("Basic ")))
                .andRespond(withSuccess(twilioResponseJson, MediaType.APPLICATION_JSON));

        TwilioSmsService.SmsDispatchResult result = twilioSmsService.sendSms("+919876543210", "EMERGENCY ALERT: Test user triggered SOS");

        mockServer.verify();
        assertEquals(NotificationDeliveryStatus.QUEUED, result.status());
        assertEquals("SM998877665544332211", result.providerMessageId());
        assertNull(result.errorMessage());
    }

    @Test
    @DisplayName("Handles Twilio API error response gracefully without throwing uncaught exceptions")
    void shouldHandleTwilioApiError() {
        twilioProperties.setEnabled(true);
        twilioProperties.setAccountSid("AC_TEST_ACCOUNT_123");
        twilioProperties.setAuthToken("AUTH_TOKEN_TEST_456");
        twilioProperties.setFromPhoneNumber("+15551234567");

        String errorResponseJson = """
                {
                    "code": 21211,
                    "message": "The 'To' number +910000000000 is not a valid phone number.",
                    "status": 400
                }
                """;

        mockServer.expect(requestTo("https://api.twilio.com/2010-04-01/Accounts/AC_TEST_ACCOUNT_123/Messages.json"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body(errorResponseJson).contentType(MediaType.APPLICATION_JSON));

        TwilioSmsService.SmsDispatchResult result = twilioSmsService.sendSms("+910000000000", "EMERGENCY ALERT");

        mockServer.verify();
        assertEquals(NotificationDeliveryStatus.FAILED, result.status());
        assertNull(result.providerMessageId());
        assertNotNull(result.errorMessage());
        assertTrue(result.errorMessage().contains("The 'To' number"));
    }
}
