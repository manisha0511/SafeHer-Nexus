package com.safehernexus.backend.dto.ai;

import java.util.List;

public record AiAssistantResponseDto(
        String reply,
        boolean isEmergency,
        String emergencyActionRecommended,
        List<String> suggestedHelplines,
        String source,
        String disclaimer
) {
    public static final String STANDARD_DISCLAIMER =
            "SafeHer Nexus AI Assistant provides informational safety suggestions based on verified safety practices. "
                    + "It is not an emergency response service or guarantee of safety. In immediate danger, call 112 or activate the SOS alert.";

    public static AiAssistantResponseDto emergencyResponse(
            String reply,
            String emergencyAction,
            List<String> helplines
    ) {
        return new AiAssistantResponseDto(
                reply,
                true,
                emergencyAction,
                helplines,
                "EMERGENCY_OVERRIDE",
                STANDARD_DISCLAIMER
        );
    }

    public static AiAssistantResponseDto standardResponse(
            String reply,
            List<String> helplines,
            String source
    ) {
        return new AiAssistantResponseDto(
                reply,
                false,
                null,
                helplines,
                source,
                STANDARD_DISCLAIMER
        );
    }
}
