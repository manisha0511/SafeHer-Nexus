package com.safehernexus.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safehernexus.backend.config.AiProperties;
import com.safehernexus.backend.dto.ai.AiAssistantRequestDto;
import com.safehernexus.backend.dto.ai.AiAssistantResponseDto;
import com.safehernexus.backend.entity.SafetyTip;
import com.safehernexus.backend.exception.BusinessRuleViolationException;
import com.safehernexus.backend.exception.RateLimitExceededException;
import com.safehernexus.backend.repository.SafetyTipRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class AiSafetyAssistantService {

    private static final Logger log = LoggerFactory.getLogger(AiSafetyAssistantService.class);

    private static final int MAX_REQUESTS_PER_MINUTE = 15;

    // Pattern for detecting imminent emergency keywords
    private static final Pattern EMERGENCY_PATTERN = Pattern.compile(
            "\\b(help me|followed|following me|stalker|stalking|attack|attacking|threat|threatening|kidnap|break in|breaking in|assault|in danger|emergency|save me|harassing me|call police|call 112|someone outside)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private final AiProperties aiProperties;
    private final SafetyTipRepository safetyTipRepository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    // In-memory rate limiting per user
    private final Map<String, Deque<Instant>> userRequestTimestamps = new ConcurrentHashMap<>();

    @Autowired
    public AiSafetyAssistantService(
            AiProperties aiProperties,
            SafetyTipRepository safetyTipRepository,
            ObjectMapper objectMapper
    ) {
        this.aiProperties = aiProperties;
        this.safetyTipRepository = safetyTipRepository;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public AiSafetyAssistantService(
            AiProperties aiProperties,
            SafetyTipRepository safetyTipRepository,
            ObjectMapper objectMapper,
            RestClient restClient
    ) {
        this.aiProperties = aiProperties;
        this.safetyTipRepository = safetyTipRepository;
        this.objectMapper = objectMapper;
        this.restClient = restClient;
    }

    public AiAssistantResponseDto processUserMessage(String userEmail, AiAssistantRequestDto request) {
        if (request == null || request.message() == null || request.message().isBlank()) {
            throw new BusinessRuleViolationException("Message cannot be empty");
        }

        enforceRateLimit(userEmail);

        String message = request.message().trim();

        // 1. SAFETY OVERRIDE: Prioritize immediate danger detection above all else
        if (isEmergencyIntent(message)) {
            log.warn("Emergency intent detected in message from user: {}", userEmail);
            return handleEmergencyOverride(message);
        }

        // 2. If external AI provider is configured and enabled, attempt AI generation
        if (aiProperties.isConfigured()) {
            try {
                return callAiProvider(message);
            } catch (Exception ex) {
                log.error("AI provider call failed, falling back to verified safety knowledge base: {}", ex.getMessage());
            }
        }

        // 3. Grounded Fallback: Generate contextual answer using verified safety knowledge base
        return generateGroundedFallbackResponse(message);
    }

    private void enforceRateLimit(String userEmail) {
        Instant now = Instant.now();
        Instant oneMinuteAgo = now.minus(Duration.ofMinutes(1));

        Deque<Instant> timestamps = userRequestTimestamps.computeIfAbsent(userEmail, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(oneMinuteAgo)) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                throw new RateLimitExceededException(
                        "Rate limit reached. To ensure fair access and prevent abuse, please wait a moment before sending another message."
                );
            }
            timestamps.addLast(now);
        }
    }

    private boolean isEmergencyIntent(String message) {
        return EMERGENCY_PATTERN.matcher(message).find();
    }

    private AiAssistantResponseDto handleEmergencyOverride(String message) {
        String reply = "⚠️ IMMEDIATE DANGER DETECTED:\n\n"
                + "If you are in immediate danger, do NOT rely on a chat conversation:\n\n"
                + "1. Dial 112 (National Emergency Helpline) or 1091 (Women in Distress Helpline) immediately!\n"
                + "2. Tap the red SOS button in SafeHer Nexus to trigger continuous GPS tracking and dispatch alert notifications to your trusted emergency contacts.\n"
                + "3. Move directly toward a well-lit, crowded area, staffed shop, security booth, or police station.\n"
                + "4. If in a cab, ask the driver to stop near a crowded public place or call out for help.";

        List<String> helplines = List.of(
                "112 - National Emergency (Police, Fire, Medical)",
                "1091 - Women in Distress Helpline (24x7)",
                "1090 - Women Power Line (Anti-Harassment)"
        );

        String emergencyAction = "Call 112 or activate SafeHer Nexus SOS immediately.";

        return AiAssistantResponseDto.emergencyResponse(reply, emergencyAction, helplines);
    }

    private AiAssistantResponseDto callAiProvider(String userMessage) throws Exception {
        String endpoint = aiProperties.getEndpoint();
        String model = aiProperties.getModel();
        String apiKey = aiProperties.getApiKey();

        List<SafetyTip> verifiedTips = safetyTipRepository.findAllByOrderByDisplayOrderAscIdAsc();
        StringBuilder knowledgeBaseSummary = new StringBuilder();
        for (SafetyTip tip : verifiedTips) {
            knowledgeBaseSummary.append("- [").append(tip.getCategory()).append("] ")
                    .append(tip.getTitle()).append(": ").append(tip.getContent());
            if (tip.getEmergencyNumber() != null) {
                knowledgeBaseSummary.append(" (Number: ").append(tip.getEmergencyNumber()).append(")");
            }
            knowledgeBaseSummary.append("\n");
        }

        String systemPrompt = "You are the SafeHer Nexus AI Safety Assistant, an expert, empathetic personal safety companion for women and solo travelers. "
                + "Your primary mission is empowering users with actionable, practical safety advice for transit, travel, night walks, and digital privacy.\n"
                + "GROUND TRUTH VERIFIED PRINCIPLES:\n"
                + knowledgeBaseSummary
                + "\nRULES:\n"
                + "1. Keep advice concise, factual, and empowering.\n"
                + "2. Never encourage physical confrontation with an aggressor.\n"
                + "3. If the user mentions any emergency or immediate threat, instruct them clearly to dial 112 or 1091 and tap the SOS alert.\n"
                + "4. Do not present yourself as a replacement for official emergency services.";

        if ("gemini".equalsIgnoreCase(aiProperties.getProvider())) {
            String url = endpoint + "/models/" + model + ":generateContent?key=" + apiKey;

            Map<String, Object> requestPayload = Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", userMessage))))
            );

            String responseBody = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
                if (!textNode.isMissingNode()) {
                    return AiAssistantResponseDto.standardResponse(
                            textNode.asText(),
                            extractRelevantHelplines(userMessage),
                            "AI_PROVIDER"
                    );
                }
            }
        }

        throw new IllegalStateException("Failed to obtain text from AI provider response");
    }

    private AiAssistantResponseDto generateGroundedFallbackResponse(String userMessage) {
        String lower = userMessage.toLowerCase();
        StringBuilder reply = new StringBuilder();
        List<String> helplines = new ArrayList<>();

        if (lower.contains("cab") || lower.contains("taxi") || lower.contains("uber") || lower.contains("ola") || lower.contains("ride")) {
            reply.append("Safe Travel & Ride-Sharing Precautions:\n\n")
                    .append("• Verify Vehicle Details: Always match the registration plate, driver photo, and car model before entering.\n")
                    .append("• Sit in the Rear Seat: Creates physical distance and provides exit options from both doors.\n")
                    .append("• Share Live Trip Status: Share your live ride tracking with trusted contacts.\n")
                    .append("• Keep GPS Active: Monitor the vehicle's navigation on your own device to notice route deviations.");
            helplines.add("112 - National Emergency");
            helplines.add("1091 - Women Helpline");
        } else if (lower.contains("night") || lower.contains("dark") || lower.contains("walk") || lower.contains("alone")) {
            reply.append("Night Safety & Solo Walking Guidelines:\n\n")
                    .append("• Walk with Purpose & Confidence: Keep your head up, stay alert to surroundings, and avoid fixating on your phone.\n")
                    .append("• Prepare Keys in Advance: Have house or vehicle keys in hand before reaching your destination.\n")
                    .append("• Avoid Isolated Shortcuts: Stick to well-lit, active thoroughfares even if it adds extra walking time.\n")
                    .append("• Fake Call Escape Tool: If you feel someone lingering nearby, use SafeHer Nexus Fake Call Simulator to discreetly step away.");
            helplines.add("112 - National Emergency");
            helplines.add("1091 - Women Helpline");
        } else if (lower.contains("bus") || lower.contains("metro") || lower.contains("train") || lower.contains("transit") || lower.contains("commute")) {
            reply.append("Public Commute Safety Advice:\n\n")
                    .append("• Wait in Well-Lit Zones: Stand near station CCTV cameras, ticket counters, or official personnel.\n")
                    .append("• Keep One Ear Free: Avoid wearing noise-canceling headphones over both ears during transit.\n")
                    .append("• Women's Coaches: Where available on metro/train systems, use designated women's coaches.\n")
                    .append("• Report Harassment: Report any inappropriate behavior to transit authorities or dial 1090 (Women Power Line).");
            helplines.add("1090 - Women Power Line (Anti-Harassment)");
            helplines.add("112 - National Emergency");
        } else if (lower.contains("digital") || lower.contains("online") || lower.contains("social") || lower.contains("phone") || lower.contains("cyber")) {
            reply.append("Digital Safety & Privacy Recommendations:\n\n")
                    .append("• Delay Location Sharing: Post check-ins and photos after leaving a venue rather than in real time.\n")
                    .append("• Lock Screen Privacy: Turn off lock-screen notification previews for sensitive codes and messages.\n")
                    .append("• Protect Device Access: Use biometric or secure PIN protection on your mobile device.\n")
                    .append("• Cyber Stalking Support: For online harassment or blackmail, dial 1930 (National Cyber Crime Helpline).");
            helplines.add("1930 - Cyber Crime Helpline");
            helplines.add("181 - Women Domestic & Cyber Abuse Support");
        } else if (lower.contains("helpline") || lower.contains("number") || lower.contains("police") || lower.contains("contact")) {
            reply.append("Verified Official Emergency Helplines (India):\n\n")
                    .append("• 112: Unified National Emergency Number (Police, Fire, Medical)\n")
                    .append("• 1091: 24x7 Women in Distress Helpline\n")
                    .append("• 1090: Women Power Line (Anti-Harassment & Stalking)\n")
                    .append("• 181: Women Domestic Abuse & Shelter Support\n")
                    .append("• 1930: National Cyber Crime Reporting");
            helplines.add("112 - Unified National Emergency");
            helplines.add("1091 - Women Distress Helpline");
            helplines.add("1090 - Women Power Line");
            helplines.add("181 - Domestic Abuse Helpline");
            helplines.add("1930 - Cyber Crime Helpline");
        } else {
            reply.append("SafeHer Nexus Personal Safety Guidelines:\n\n")
                    .append("• Stay Prepared: Keep your phone charged above 50% and configure up to 5 trusted emergency contacts.\n")
                    .append("• Trust Your Instincts: If an environment or individual feels uncomfortable, leave immediately toward a public establishment.\n")
                    .append("• Two-Step SOS: In any threatening situation, open the SOS tab to trigger continuous GPS tracking and alert trusted contacts.\n")
                    .append("• Discretion Tools: Use the Fake Call feature to discreetly excuse yourself from awkward situations.");
            helplines.add("112 - National Emergency");
            helplines.add("1091 - Women Helpline");
        }

        return AiAssistantResponseDto.standardResponse(
                reply.toString(),
                helplines,
                "VERIFIED_KNOWLEDGE_BASE_FALLBACK"
        );
    }

    private List<String> extractRelevantHelplines(String userMessage) {
        String lower = userMessage.toLowerCase();
        if (lower.contains("cyber") || lower.contains("online") || lower.contains("hack")) {
            return List.of("1930 - Cyber Crime Helpline", "112 - National Emergency");
        }
        if (lower.contains("harass") || lower.contains("stalk")) {
            return List.of("1090 - Women Power Line", "1091 - Women Helpline", "112 - National Emergency");
        }
        return List.of("112 - National Emergency", "1091 - Women Helpline");
    }
}
