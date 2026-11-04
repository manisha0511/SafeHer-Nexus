import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

type CallStage = 'SETUP' | 'COUNTDOWN' | 'INCOMING' | 'ACTIVE';

interface CallerPreset {
  id: string;
  label: string;
  name: string;
  number: string;
}

const CALLER_PRESETS: CallerPreset[] = [
  { id: 'mom', label: 'Mom', name: 'Mom', number: '+91 98765 43210' },
  { id: 'police', label: 'Police', name: 'Police Officer', number: '112 (Station Patrol)' },
  { id: 'boss', label: 'Boss', name: 'Manager / Boss', number: '+91 98111 22334' },
  { id: 'custom', label: 'Custom', name: '', number: '+91 99000 11223' },
];

interface DelayOption {
  seconds: number;
  label: string;
}

const DELAY_OPTIONS: DelayOption[] = [
  { seconds: 10, label: '10s' },
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '1m' },
  { seconds: 300, label: '5m' },
];

export const FakeCallScreen: React.FC = () => {
  const [stage, setStage] = useState<CallStage>('SETUP');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('mom');
  const [customCallerName, setCustomCallerName] = useState<string>('');
  const [selectedDelaySec, setSelectedDelaySec] = useState<number>(10);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(10);
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop vibration and timers on unmount
  useEffect(() => {
    return () => {
      stopAllTimersAndVibration();
    };
  }, []);

  const stopAllTimersAndVibration = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (activeCallTimerRef.current) {
      clearInterval(activeCallTimerRef.current);
      activeCallTimerRef.current = null;
    }
    try {
      Vibration.cancel();
    } catch {
      // safe fallback
    }
  };

  const getEffectiveCaller = () => {
    const preset = CALLER_PRESETS.find((p) => p.id === selectedPresetId);
    if (selectedPresetId === 'custom') {
      return {
        name: customCallerName.trim() || 'Incoming Caller',
        number: '+91 99000 11223',
      };
    }
    return {
      name: preset?.name || 'Incoming Caller',
      number: preset?.number || 'Private Number',
    };
  };

  const startCountdown = () => {
    setCountdownRemaining(selectedDelaySec);
    setStage('COUNTDOWN');

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          triggerIncomingCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    stopAllTimersAndVibration();
    setStage('SETUP');
  };

  const triggerIncomingCall = () => {
    setStage('INCOMING');
    try {
      // Repeat vibration pattern: 1000ms vibrate, 1000ms pause
      const pattern = Platform.OS === 'android' ? [0, 1000, 1000] : [1000, 1000];
      Vibration.vibrate(pattern, true);
    } catch {
      // non-blocking
    }
  };

  const handleAcceptCall = () => {
    try {
      Vibration.cancel();
    } catch {
      // safe fallback
    }
    setCallDurationSec(0);
    setStage('ACTIVE');

    if (activeCallTimerRef.current) {
      clearInterval(activeCallTimerRef.current);
    }

    activeCallTimerRef.current = setInterval(() => {
      setCallDurationSec((prev) => prev + 1);
    }, 1000);
  };

  const handleDeclineOrEndCall = () => {
    stopAllTimersAndVibration();
    setStage('SETUP');
    setIsMuted(false);
    setIsSpeakerOn(false);
  };

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const caller = getEffectiveCaller();

  // STAGE 1: INCOMING CALL FULL SCREEN
  if (stage === 'INCOMING') {
    return (
      <SafeAreaView style={styles.incomingContainer}>
        <View style={styles.incomingHeader}>
          <Text style={styles.incomingLabel}>INCOMING CALL</Text>
          <Text style={styles.incomingCallerName}>{caller.name}</Text>
          <Text style={styles.incomingCallerNumber}>{caller.number}</Text>
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatarRingOuter}>
            <View style={styles.avatarRingInner}>
              <Text style={styles.avatarInitial}>
                {caller.name.charAt(0).toUpperCase() || 'C'}
              </Text>
            </View>
          </View>
          <Text style={styles.simulatedNotice}>
            Simulated ringtone & vibration active
          </Text>
        </View>

        <View style={styles.incomingActionRow}>
          <View style={styles.callActionButtonWrapper}>
            <TouchableOpacity
              style={[styles.callCircleButton, styles.declineButton]}
              onPress={handleDeclineOrEndCall}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonGlyph}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.actionButtonLabel}>Decline</Text>
          </View>

          <View style={styles.callActionButtonWrapper}>
            <TouchableOpacity
              style={[styles.callCircleButton, styles.acceptButton]}
              onPress={handleAcceptCall}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonGlyph}>✓</Text>
            </TouchableOpacity>
            <Text style={styles.actionButtonLabel}>Accept</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // STAGE 2: ACTIVE CALL FULL SCREEN
  if (stage === 'ACTIVE') {
    return (
      <SafeAreaView style={styles.activeCallContainer}>
        <View style={styles.activeCallHeader}>
          <Text style={styles.activeCallStatus}>CONNECTED</Text>
          <Text style={styles.activeCallName}>{caller.name}</Text>
          <Text style={styles.activeCallDuration}>
            {formatTimer(callDurationSec)}
          </Text>
        </View>

        <View style={styles.inCallMockKeypad}>
          <TouchableOpacity
            style={[styles.mockKeypadBtn, isMuted && styles.mockKeypadBtnActive]}
            onPress={() => setIsMuted(!isMuted)}
            activeOpacity={0.8}
          >
            <Text style={styles.mockKeypadIcon}>🔇</Text>
            <Text style={styles.mockKeypadLabel}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mockKeypadBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.mockKeypadIcon}>⌨️</Text>
            <Text style={styles.mockKeypadLabel}>Keypad</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mockKeypadBtn,
              isSpeakerOn && styles.mockKeypadBtnActive,
            ]}
            onPress={() => setIsSpeakerOn(!isSpeakerOn)}
            activeOpacity={0.8}
          >
            <Text style={styles.mockKeypadIcon}>🔊</Text>
            <Text style={styles.mockKeypadLabel}>Speaker</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.endCallWrapper}>
          <TouchableOpacity
            style={[styles.callCircleButton, styles.endCallButton]}
            onPress={handleDeclineOrEndCall}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonGlyph}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.endCallLabel}>End Call</Text>
        </View>

        <View style={styles.activeCallFooterDisclaimer}>
          <Text style={styles.footerDisclaimerText}>
            Simulated escape call. No cellular bandwidth or real emergency
            contacts are connected.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // STAGE 3: COUNTDOWN IN PROGRESS
  if (stage === 'COUNTDOWN') {
    return (
      <SafeAreaView style={styles.countdownContainer}>
        <View style={styles.countdownCard}>
          <Text style={styles.countdownTag}>ESCAPE CALL ARMED</Text>
          <Text style={styles.countdownTimerText}>{countdownRemaining}s</Text>
          <Text style={styles.countdownDesc}>
            Incoming simulated call from{' '}
            <Text style={styles.countdownHighlight}>{caller.name}</Text> will
            ring when the timer reaches zero.
          </Text>
          <Text style={styles.countdownTip}>
            You can lock your phone screen or leave the app open. Keep volume on.
          </Text>

          <TouchableOpacity
            style={styles.cancelCountdownButton}
            onPress={cancelCountdown}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelCountdownText}>Cancel Scheduled Call</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // STAGE 0: SETUP SCREEN
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerBox}>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>SAFETY ESCAPE TOOL</Text>
        </View>
        <Text style={styles.title}>Fake Call Simulator</Text>
        <Text style={styles.subtitle}>
          Discreetly exit awkward, threatening, or uncomfortable situations with
          a scheduled incoming call simulation.
        </Text>
      </View>

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>Safety Notice</Text>
        <Text style={styles.disclaimerText}>
          This feature is strictly a simulated escape tool. It does not place real
          telephone calls or contact actual emergency services. In genuine
          emergencies, use the SOS Emergency tab or dial national helpline 112.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>1. Select Simulated Caller</Text>
        <View style={styles.presetRow}>
          {CALLER_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetChip,
                  isSelected && styles.presetChipSelected,
                ]}
                onPress={() => setSelectedPresetId(preset.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    isSelected && styles.presetChipTextSelected,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedPresetId === 'custom' ? (
          <View style={styles.customInputBox}>
            <Text style={styles.inputLabel}>Custom Caller Name:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Doctor, Security, Sarah"
              placeholderTextColor="#94A3B8"
              value={customCallerName}
              onChangeText={setCustomCallerName}
              maxLength={30}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>2. Set Ring Delay</Text>
        <Text style={styles.cardHint}>
          Choose how long to wait before the phone begins ringing:
        </Text>
        <View style={styles.delayRow}>
          {DELAY_OPTIONS.map((opt) => {
            const isSelected = selectedDelaySec === opt.seconds;
            return (
              <TouchableOpacity
                key={opt.seconds}
                style={[
                  styles.delayButton,
                  isSelected && styles.delayButtonSelected,
                ]}
                onPress={() => setSelectedDelaySec(opt.seconds)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.delayButtonText,
                    isSelected && styles.delayButtonTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>3. Preview Call Configuration</Text>
        <View style={styles.previewBox}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Caller:</Text>
            <Text style={styles.previewValue}>{caller.name}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Delay:</Text>
            <Text style={styles.previewValue}>{selectedDelaySec} seconds</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Feedback:</Text>
            <Text style={styles.previewValue}>Vibration & Ring Screen</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={startCountdown}
          activeOpacity={0.85}
        >
          <Text style={styles.scheduleButtonText}>
            Schedule Fake Call ({selectedDelaySec}s)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.instantTriggerButton}
          onPress={triggerIncomingCall}
          activeOpacity={0.85}
        >
          <Text style={styles.instantTriggerText}>Ring Immediately</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
  },
  headerBox: {
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  disclaimerBox: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  cardHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetChipSelected: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  presetChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customInputBox: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 48,
  },
  delayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  delayButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 44,
  },
  delayButtonSelected: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  delayButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  delayButtonTextSelected: {
    color: '#FFFFFF',
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  scheduleButton: {
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 10,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  instantTriggerButton: {
    backgroundColor: '#EDE9FE',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  instantTriggerText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '700',
  },

  // COUNTDOWN VIEW
  countdownContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  countdownCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  countdownTag: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  countdownTimerText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  countdownDesc: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  countdownHighlight: {
    color: '#A78BFA',
    fontWeight: '700',
  },
  countdownTip: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelCountdownButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelCountdownText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // INCOMING CALL VIEW
  incomingContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  incomingHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  incomingLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  incomingCallerName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  incomingCallerNumber: {
    fontSize: 15,
    color: '#64748B',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  avatarRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarRingInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
  },
  simulatedNotice: {
    color: '#94A3B8',
    fontSize: 12,
  },
  incomingActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 40,
  },
  callActionButtonWrapper: {
    alignItems: 'center',
  },
  callCircleButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  acceptButton: {
    backgroundColor: '#16A34A',
  },
  declineButton: {
    backgroundColor: '#DC2626',
  },
  buttonGlyph: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  actionButtonLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },

  // ACTIVE CALL VIEW
  activeCallContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  activeCallHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  activeCallStatus: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  activeCallName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  activeCallDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
  },
  inCallMockKeypad: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginVertical: 40,
  },
  mockKeypadBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mockKeypadBtnActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#8B5CF6',
  },
  mockKeypadIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  mockKeypadLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  endCallWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  endCallButton: {
    backgroundColor: '#DC2626',
  },
  endCallLabel: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '700',
  },
  activeCallFooterDisclaimer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerDisclaimerText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
