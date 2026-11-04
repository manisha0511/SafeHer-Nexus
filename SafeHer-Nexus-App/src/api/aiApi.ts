import { getAccessToken } from '../storage/tokenStorage';
import { AiAssistantRequest, AiAssistantResponse } from '../types/aiAssistant';
import { ApiClientError, apiRequest } from './apiClient';

const FALLBACK_DISCLAIMER =
  'SafeHer Nexus AI Assistant provides informational safety suggestions based on verified safety practices. ' +
  'It is not an emergency response service or guarantee of safety. In immediate danger, call 112 or activate the SOS alert.';

export async function sendAiChatMessageApi(
  message: string,
  conversationId?: string | null
): Promise<AiAssistantResponse> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiClientError('Authentication required to use AI Assistant', 401);
  }

  const payload: AiAssistantRequest = {
    message: message.trim(),
    conversationId: conversationId ?? null,
  };

  try {
    return await apiRequest<AiAssistantResponse>('/api/ai/assistant/chat', {
      method: 'POST',
      body: payload,
      token,
      timeoutMs: 12000,
    });
  } catch (error) {
    if (error instanceof ApiClientError) {
      // Re-throw 400 validation/rate-limit or 401 auth errors to display direct user feedback
      throw error;
    }

    // Network failure / server offline fallback
    return {
      reply:
        'SafeHer Nexus Grounded Safety Guidance (Offline Mode):\n\n' +
        '• Stay Prepared: Keep your phone charged and ensure your emergency contacts are configured in the app.\n' +
        '• Stay in Well-Lit Areas: When walking alone, prioritize open roads and commercial corridors.\n' +
        '• Immediate Danger: Do not wait for AI chat responses. Call 112 or open the SOS tab to trigger real-time alerts.',
      isEmergency: false,
      emergencyActionRecommended: null,
      suggestedHelplines: ['112 - National Emergency', '1091 - Women Helpline (All India)'],
      source: 'OFFLINE_SAFETY_FALLBACK',
      disclaimer: FALLBACK_DISCLAIMER,
    };
  }
}
