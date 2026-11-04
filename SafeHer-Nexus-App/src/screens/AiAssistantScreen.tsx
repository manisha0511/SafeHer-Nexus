import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { sendAiChatMessageApi } from '../api/aiApi';
import { ChatMessage } from '../types/aiAssistant';
import { AuthenticatedTab } from '../types/auth';

interface AiAssistantScreenProps {
  onNavigateTab?: (tab: AuthenticatedTab) => void;
}

const QUICK_PROMPTS = [
  'Walking alone at night safety',
  'Cab & auto ride verification',
  'Public transit & metro precautions',
  'Digital privacy & cyber stalking',
  'Essential safety checklist',
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    sender: 'assistant',
    text:
      'Hello! I am your SafeHer Safety Assistant. You can ask me for practical, verified advice on solo travel, late-night transit, cab safety, digital privacy, and preparedness.\n\n' +
      '⚠️ If you are in immediate danger or being followed, do not rely on chat. Call 112 or open the SOS Emergency tab immediately.',
    timestamp: 'Just now',
    suggestedHelplines: ['112 - National Emergency', '1091 - Women Helpline (All India)'],
    disclaimer:
      'SafeHer AI Assistant provides informational suggestions based on verified safety practices. It is not an emergency response service or guarantee of safety.',
  },
];

export const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeEmergency, setActiveEmergency] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleCallNumber = (rawNumber: string) => {
    const cleaned = rawNumber.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${cleaned}`;
    Linking.canOpenURL(telUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(telUrl);
        } else {
          Alert.alert('Phone Call Unavailable', `Please dial ${cleaned} manually.`);
        }
      })
      .catch(() => {
        Alert.alert('Phone Call Error', `Please dial ${cleaned} manually.`);
      });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || isLoading) {
      return;
    }

    setErrorMessage(null);
    setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await sendAiChatMessageApi(message);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEmergency: response.isEmergency,
        emergencyActionRecommended: response.emergencyActionRecommended,
        suggestedHelplines: response.suggestedHelplines,
        disclaimer: response.disclaimer,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (response.isEmergency) {
        setActiveEmergency(true);
      }
    } catch (err: unknown) {
      const errorText =
        err instanceof Error ? err.message : 'Unable to contact safety assistant. Please try again.';
      setErrorMessage(errorText);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>AI Safety Assistant</Text>
          <View style={styles.safetyTag}>
            <Text style={styles.safetyTagText}>GROUNDED KNOWLEDGE</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Verified guidance for commuting, solo travel & digital privacy
        </Text>
      </View>

      {/* Emergency Priority Banner */}
      {activeEmergency && (
        <View style={styles.emergencyAlertBanner}>
          <View style={styles.emergencyBannerHeader}>
            <Text style={styles.emergencyBannerIcon}>🚨</Text>
            <View style={styles.emergencyBannerTextContainer}>
              <Text style={styles.emergencyBannerTitle}>IMMEDIATE SAFETY PRIORITY</Text>
              <Text style={styles.emergencyBannerSub}>
                Potential threat or emergency detected. Prioritize calling emergency services or triggering SOS.
              </Text>
            </View>
          </View>
          <View style={styles.emergencyBannerActions}>
            <TouchableOpacity
              style={styles.emergencyDialButton}
              onPress={() => handleCallNumber('112')}
              activeOpacity={0.8}
            >
              <Text style={styles.emergencyDialText}>📞 Call 112</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emergencyDialButton}
              onPress={() => handleCallNumber('1091')}
              activeOpacity={0.8}
            >
              <Text style={styles.emergencyDialText}>📞 Call 1091</Text>
            </TouchableOpacity>
            {onNavigateTab && (
              <TouchableOpacity
                style={styles.emergencySosButton}
                onPress={() => onNavigateTab('SOS')}
                activeOpacity={0.8}
              >
                <Text style={styles.emergencySosText}>🚨 Open SOS</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Quick Prompts Bar */}
      <View style={styles.quickPromptsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsList}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_PROMPTS.map((prompt, idx) => (
            <TouchableOpacity
              key={`prompt-${idx}`}
              style={styles.promptChip}
              onPress={() => handleSendMessage(prompt)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.promptChipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Error Message Box */}
      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      )}

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isUrgent = msg.isEmergency;

          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  isUser
                    ? styles.messageBubbleUser
                    : isUrgent
                    ? styles.messageBubbleEmergency
                    : styles.messageBubbleAssistant,
                ]}
              >
                {/* Emergency Tag for Assistant Messages */}
                {isUrgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>
                      🚨 EMERGENCY OVERRIDE TRIGGERED
                    </Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.messageTextUser : styles.messageTextAssistant,
                  ]}
                >
                  {msg.text}
                </Text>

                {/* Emergency Actions inside urgent bubble */}
                {isUrgent && (
                  <View style={styles.bubbleActionRow}>
                    <TouchableOpacity
                      style={styles.bubbleDialButton}
                      onPress={() => handleCallNumber('112')}
                    >
                      <Text style={styles.bubbleDialText}>Dial 112 (National)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.bubbleDialButton}
                      onPress={() => handleCallNumber('1091')}
                    >
                      <Text style={styles.bubbleDialText}>Dial 1091 (Women)</Text>
                    </TouchableOpacity>
                    {onNavigateTab && (
                      <TouchableOpacity
                        style={styles.bubbleSosButton}
                        onPress={() => onNavigateTab('SOS')}
                      >
                        <Text style={styles.bubbleSosText}>Trigger SOS Alert</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Suggested Helplines */}
                {msg.suggestedHelplines && msg.suggestedHelplines.length > 0 && (
                  <View style={styles.helplinesContainer}>
                    <Text style={styles.helplinesHeading}>Verified Helplines (Tap to Call):</Text>
                    <View style={styles.helplineChipsWrapper}>
                      {msg.suggestedHelplines.map((helpline, hIdx) => {
                        const numberMatch = helpline.match(/\b\d{3,4}\b/);
                        const dialNum = numberMatch ? numberMatch[0] : helpline;

                        return (
                          <TouchableOpacity
                            key={`hl-${hIdx}`}
                            style={styles.helplineChip}
                            onPress={() => handleCallNumber(dialNum)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.helplineChipText}>📞 {helpline}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Disclaimer in bubble if provided */}
                {msg.disclaimer && (
                  <Text style={styles.bubbleDisclaimer}>{msg.disclaimer}</Text>
                )}

                <Text
                  style={[
                    styles.messageTime,
                    isUser ? styles.messageTimeUser : styles.messageTimeAssistant,
                  ]}
                >
                  {msg.timestamp}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <View style={[styles.messageRow, styles.messageRowAssistant]}>
            <View style={[styles.messageBubble, styles.messageBubbleAssistant, styles.loadingBubble]}>
              <ActivityIndicator size="small" color="#E11D48" />
              <Text style={styles.loadingBubbleText}>Consulting verified safety guidelines...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Informational Disclaimer Footer */}
      <View style={styles.footerDisclaimer}>
        <Text style={styles.footerDisclaimerText}>
          ℹ️ Informational guidance only. Not an emergency dispatch service. Call 112 in emergencies.
        </Text>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask a safety question (e.g. late night metro)..."
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  safetyTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  safetyTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  emergencyAlertBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 2,
    borderBottomColor: '#EF4444',
    padding: 12,
  },
  emergencyBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emergencyBannerIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  emergencyBannerTextContainer: {
    flex: 1,
  },
  emergencyBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  emergencyBannerSub: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
  emergencyBannerActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  emergencyDialButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  emergencyDialText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emergencySosButton: {
    flex: 1,
    backgroundColor: '#991B1B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  emergencySosText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  quickPromptsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  quickPromptsList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  promptChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '500',
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    padding: 12,
  },
  messageBubbleUser: {
    backgroundColor: '#E11D48',
    borderBottomRightRadius: 4,
  },
  messageBubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  messageBubbleEmergency: {
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderBottomLeftRadius: 4,
  },
  urgentBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  urgentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextAssistant: {
    color: '#1E293B',
  },
  bubbleActionRow: {
    marginTop: 10,
    gap: 6,
  },
  bubbleDialButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  bubbleDialText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  bubbleSosButton: {
    backgroundColor: '#991B1B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  bubbleSosText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  helplinesContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  helplinesHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  helplineChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  helplineChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  helplineChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  bubbleDisclaimer: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  messageTimeUser: {
    color: '#FDE047',
  },
  messageTimeAssistant: {
    color: '#94A3B8',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingBubbleText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  footerDisclaimer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerDisclaimerText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 90,
  },
  sendButton: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 64,
  },
  sendButtonDisabled: {
    backgroundColor: '#FDA4AF',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
