export interface AiAssistantRequest {
  message: string;
  conversationId?: string | null;
}

export interface AiAssistantResponse {
  reply: string;
  isEmergency: boolean;
  emergencyActionRecommended?: string | null;
  suggestedHelplines: string[];
  source: string;
  disclaimer: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isEmergency?: boolean;
  emergencyActionRecommended?: string | null;
  suggestedHelplines?: string[];
  disclaimer?: string;
}
