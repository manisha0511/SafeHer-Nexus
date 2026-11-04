package com.safehernexus.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.config.TwilioProperties;
import com.safehernexus.backend.entity.NotificationDeliveryStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class TwilioSmsService {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsService.class);

    private final TwilioProperties twilioProperties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public record SmsDispatchResult(
            NotificationDeliveryStatus status,
            String providerMessageId,
            String errorMessage
    ) {
    }

    @org.springframework.beans.factory.annotation.Autowired
    public TwilioSmsService(TwilioProperties twilioProperties, ObjectMapper objectMapper) {
        this.twilioProperties = twilioProperties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public TwilioSmsService(
            TwilioProperties twilioProperties,
            ObjectMapper objectMapper,
            RestClient restClient
    ) {
        this.twilioProperties = twilioProperties;
        this.objectMapper = objectMapper;
        this.restClient = restClient;
    }

    public SmsDispatchResult sendSms(String toPhoneNumber, String messageBody) {
        if (!twilioProperties.isConfigured()) {
            log.info("Twilio SMS is not configured or disabled. Skipping real SMS dispatch.");
            return new SmsDispatchResult(
                    NotificationDeliveryStatus.NOT_CONFIGURED,
                    null,
                    "Twilio SMS credentials are not configured on the server."
            );
        }

        if (toPhoneNumber == null || toPhoneNumber.isBlank()) {
            return new SmsDispatchResult(
                    NotificationDeliveryStatus.FAILED,
                    null,
                    "Recipient phone number is blank or missing."
            );
        }

        String accountSid = twilioProperties.getAccountSid();
        String authToken = twilioProperties.getAuthToken();
        String fromPhoneNumber = twilioProperties.getFromPhoneNumber();

        String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("To", toPhoneNumber.trim());
        formData.add("From", fromPhoneNumber.trim());
        formData.add("Body", messageBody);

        if (twilioProperties.getStatusCallbackUrl() != null && !twilioProperties.getStatusCallbackUrl().isBlank()) {
            formData.add("StatusCallback", twilioProperties.getStatusCallbackUrl().trim());
        }

        String authHeader = "Basic " + Base64.getEncoder().encodeToString(
                (accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8)
        );

        try {
            String responseBody = restClient.post()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, authHeader)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(String.class);

            if (responseBody == null || responseBody.isBlank()) {
                return new SmsDispatchResult(
                        NotificationDeliveryStatus.FAILED,
                        null,
                        "Empty response received from Twilio SMS API."
                );
            }

            JsonNode root = objectMapper.readTree(responseBody);
            String sid = root.hasNonNull("sid") ? root.get("sid").asText() : null;
            String twilioStatus = root.hasNonNull("status") ? root.get("status").asText().toLowerCase() : "";

            NotificationDeliveryStatus mappedStatus = switch (twilioStatus) {
                case "delivered" -> NotificationDeliveryStatus.DELIVERED;
                case "sent" -> NotificationDeliveryStatus.SENT;
                case "queued", "accepted", "sending" -> NotificationDeliveryStatus.QUEUED;
                case "failed", "undelivered" -> NotificationDeliveryStatus.FAILED;
                default -> NotificationDeliveryStatus.QUEUED;
            };

            log.info("Twilio SMS dispatched. SID: {}, status: {}", sid, mappedStatus);
            return new SmsDispatchResult(mappedStatus, sid, null);

        } catch (RestClientResponseException ex) {
            String errorDetail = "Twilio API error HTTP " + ex.getStatusCode().value();
            try {
                JsonNode errJson = objectMapper.readTree(ex.getResponseBodyAsString());
                if (errJson.hasNonNull("message")) {
                    errorDetail += ": " + errJson.get("message").asText();
                }
            } catch (Exception parseEx) {
                errorDetail += ": " + ex.getStatusText();
            }
            log.error("Failed to send Twilio SMS to {}: {}", toPhoneNumber, errorDetail);
            return new SmsDispatchResult(NotificationDeliveryStatus.FAILED, null, errorDetail);
        } catch (Exception ex) {
            log.error("Unexpected error sending Twilio SMS to {}: {}", toPhoneNumber, ex.getMessage(), ex);
            return new SmsDispatchResult(
                    NotificationDeliveryStatus.FAILED,
                    null,
                    "Provider connection error: " + ex.getMessage()
            );
        }
    }
}
