import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackendStatusCard } from '../components/BackendStatusCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { UnauthenticatedRoute } from '../types/auth';

interface WelcomeScreenProps {
  onNavigate: (route: UnauthenticatedRoute) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.shieldBadge}>
            <Text style={styles.shieldText}>SHN</Text>
          </View>
          <Text style={styles.title}>SafeHer Nexus</Text>
          <Text style={styles.subtitle}>
            Your trusted personal safety companion for rapid assistance,
            verified contacts, and secure emergency workflows.
          </Text>
        </View>

        <View style={styles.featuresBox}>
          <Text style={styles.sectionHeading}>Security-First Foundation</Text>
          <Text style={styles.featureItem}>
            • Encrypted JWT session storage via Android Keystore
          </Text>
          <Text style={styles.featureItem}>
            • BCrypt password protection & strict input validation
          </Text>
          <Text style={styles.featureItem}>
            • Direct REST communication with SafeHer Nexus Backend
          </Text>
        </View>

        <BackendStatusCard />

        <View style={styles.actionGroup}>
          <PrimaryButton
            title="Create New Account"
            onPress={() => onNavigate('REGISTER')}
            variant="primary"
          />
          <PrimaryButton
            title="Sign In to Existing Account"
            onPress={() => onNavigate('LOGIN')}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 28,
    justifyContent: 'space-between',
  },
  heroCard: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  shieldBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  shieldText: {
    color: '#6D28D9',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 5,
    lineHeight: 19,
  },
  actionGroup: {
    marginTop: 14,
  },
});
