import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BackendStatusCard } from '../components/BackendStatusCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { AuthenticatedTab } from '../types/auth';

interface HomeScreenProps {
  onSelectTab: (tab: AuthenticatedTab) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTab }) => {
  const { user, refreshProfile, logout } = useAuth();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerifySession = async () => {
    setRefreshing(true);
    setVerifyStatus(null);
    setVerifyError(null);
    try {
      const updated = await refreshProfile();
      setVerifyStatus(
        `Verified via GET /api/auth/me for ${updated.email} at ${new Date().toLocaleTimeString()}`
      );
    } catch (err: unknown) {
      setVerifyError(
        err instanceof Error ? err.message : 'Failed to verify session'
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.badge}>AUTHENTICATED SESSION</Text>
        <Text style={styles.welcomeTitle}>
          Hello, {user?.name || 'SafeHer User'}
        </Text>
        <Text style={styles.subtitle}>
          Access your SOS Emergency Center, safety profile, trusted contacts,
          and event history.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.sosHeroCard}
        onPress={() => onSelectTab('SOS')}
        activeOpacity={0.85}
      >
        <View style={styles.sosHeroTopRow}>
          <Text style={styles.sosHeroBadge}>EMERGENCY WORKFLOW</Text>
          <Text style={styles.sosHeroArrow}>Open SOS →</Text>
        </View>
        <Text style={styles.sosHeroTitle}>SOS Emergency Center</Text>
        <Text style={styles.sosHeroDesc}>
          Trigger a verified SOS alert with foreground location capture or
          manage an active emergency event.
        </Text>
      </TouchableOpacity>

      <View style={styles.quickNavGrid}>
        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onSelectTab('PROFILE')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickCardTitle}>My Safety Profile</Text>
          <Text style={styles.quickCardDesc}>
            View & edit your name, phone number, and medical/safety notes.
          </Text>
          <Text style={styles.quickCardLink}>Open Profile →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onSelectTab('CONTACTS')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickCardTitle}>Trusted Contacts (Max 5)</Text>
          <Text style={styles.quickCardDesc}>
            Add, edit, or remove trusted people and designate a primary contact.
          </Text>
          <Text style={styles.quickCardLink}>Manage Contacts →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onSelectTab('FAKECALL')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickCardTitle}>Fake Call Simulator</Text>
          <Text style={styles.quickCardDesc}>
            Trigger or schedule a simulated incoming call to discreetly exit uncomfortable situations.
          </Text>
          <Text style={styles.quickCardLink}>Open Fake Call →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onSelectTab('SAFETY_TIPS')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickCardTitle}>Safety Tips & Helplines</Text>
          <Text style={styles.quickCardDesc}>
            Quick-dial verified national emergency lines (112, 1091) and view travel/night safety advice.
          </Text>
          <Text style={styles.quickCardLink}>Explore Safety Hub →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onSelectTab('HISTORY')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickCardTitle}>Emergency Event History</Text>
          <Text style={styles.quickCardDesc}>
            View chronological logs of your SOS alerts and check-ins.
          </Text>
          <Text style={styles.quickCardLink}>View History →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onSelectTab('AI_ASSISTANT')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickCardTitle}>AI Safety Assistant</Text>
          <Text style={styles.quickCardDesc}>
            Ask for grounded advice on solo travel, night transit, rideshare safety, and digital security.
          </Text>
          <Text style={styles.quickCardLink}>Chat with Assistant →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onSelectTab('ROUTES')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickCardTitle}>Smart Route Recommendations</Text>
          <Text style={styles.quickCardDesc}>
            Find arterial corridors prioritizing well-lit roads, transit routes, and commercial areas.
          </Text>
          <Text style={styles.quickCardLink}>Plan Safe Route →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.cardHeading}>Account Summary (/api/auth/me)</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>User ID</Text>
          <Text style={styles.detailValue}>#{user?.id}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Full Name</Text>
          <Text style={styles.detailValue}>{user?.name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{user?.email}</Text>
        </View>

        {user?.phoneNumber ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{user.phoneNumber}</Text>
          </View>
        ) : null}

        {verifyStatus ? (
          <View style={styles.verifySuccess}>
            <Text style={styles.verifySuccessText}>{verifyStatus}</Text>
          </View>
        ) : null}

        {verifyError ? (
          <View style={styles.verifyErrorBox}>
            <Text style={styles.verifyErrorText}>{verifyError}</Text>
          </View>
        ) : null}

        <View style={styles.buttonSpacer}>
          <PrimaryButton
            title="Verify Session (/api/auth/me)"
            onPress={handleVerifySession}
            loading={refreshing}
            variant="secondary"
          />
        </View>
      </View>

      <BackendStatusCard />

      <View style={styles.logoutSection}>
        <PrimaryButton title="Sign Out" onPress={logout} variant="danger" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerBox: {
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  welcomeTitle: {
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
  sosHeroCard: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  sosHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sosHeroBadge: {
    backgroundColor: '#991B1B',
    color: '#FEE2E2',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    letterSpacing: 0.5,
  },
  sosHeroArrow: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sosHeroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4,
  },
  sosHeroDesc: {
    color: '#FEE2E2',
    fontSize: 13,
    lineHeight: 18,
  },
  quickNavGrid: {
    marginBottom: 14,
  },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  quickCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  quickCardDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  quickCardLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  verifySuccess: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  verifySuccessText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
  verifyErrorBox: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  verifyErrorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonSpacer: {
    marginTop: 12,
  },
  logoutSection: {
    marginTop: 12,
  },
});
