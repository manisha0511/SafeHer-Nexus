import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AiAssistantScreen } from './src/screens/AiAssistantScreen';
import { ContactsScreen } from './src/screens/ContactsScreen';
import { EmergencyHistoryScreen } from './src/screens/EmergencyHistoryScreen';
import { FakeCallScreen } from './src/screens/FakeCallScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { RoutePlannerScreen } from './src/screens/RoutePlannerScreen';
import { SafetyTipsScreen } from './src/screens/SafetyTipsScreen';
import { SosScreen } from './src/screens/SosScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AuthenticatedTab, UnauthenticatedRoute } from './src/types/auth';

const TAB_ITEMS: { key: AuthenticatedTab; label: string; isSos?: boolean }[] = [
  { key: 'DASHBOARD', label: 'Home' },
  { key: 'SOS', label: 'SOS', isSos: true },
  { key: 'AI_ASSISTANT', label: 'AI Assistant' },
  { key: 'ROUTES', label: 'Safe Routes' },
  { key: 'FAKECALL', label: 'Fake Call' },
  { key: 'SAFETY_TIPS', label: 'Safety Hub' },
  { key: 'CONTACTS', label: 'Contacts' },
  { key: 'PROFILE', label: 'Profile' },
  { key: 'HISTORY', label: 'History' },
];

const AuthenticatedShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuthenticatedTab>('DASHBOARD');

  // Handle Android hardware back-button navigation
  useEffect(() => {
    const onBackPress = () => {
      if (activeTab !== 'DASHBOARD') {
        setActiveTab('DASHBOARD');
        return true; // Prevent default app exit, return to Dashboard
      }
      return false; // On Dashboard, allow standard Android behavior
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => subscription.remove();
  }, [activeTab]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'SOS':
        return (
          <SosScreen onNavigateToHistory={() => setActiveTab('HISTORY')} />
        );
      case 'AI_ASSISTANT':
        return <AiAssistantScreen onNavigateTab={setActiveTab} />;
      case 'ROUTES':
        return <RoutePlannerScreen />;
      case 'FAKECALL':
        return <FakeCallScreen />;
      case 'SAFETY_TIPS':
        return <SafetyTipsScreen />;
      case 'PROFILE':
        return <ProfileScreen />;
      case 'CONTACTS':
        return <ContactsScreen />;
      case 'HISTORY':
        return <EmergencyHistoryScreen />;
      case 'DASHBOARD':
      default:
        return <HomeScreen onSelectTab={setActiveTab} />;
    }
  };

  return (
    <SafeAreaView style={styles.authenticatedSafeArea}>
      <View style={styles.contentArea}>{renderActiveTab()}</View>

      <View style={styles.bottomNavBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bottomNavBar}
        >
          {TAB_ITEMS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.navTabButton,
                  tab.isSos ? styles.navTabSosButton : null,
                  isSelected
                    ? tab.isSos
                      ? styles.navTabSosButtonActive
                      : styles.navTabButtonActive
                    : null,
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                <Text
                  style={[
                    styles.navTabText,
                    tab.isSos ? styles.navTabSosText : null,
                    isSelected
                      ? tab.isSos
                        ? styles.navTabSosTextActive
                        : styles.navTabTextActive
                      : null,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const RootNavigator: React.FC = () => {
  const { user, isRestoringSession } = useAuth();
  const [route, setRoute] = useState<UnauthenticatedRoute>('WELCOME');

  // Handle Android back button in unauthenticated onboarding flow
  useEffect(() => {
    const onBackPress = () => {
      if (route !== 'WELCOME') {
        setRoute('WELCOME');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => subscription.remove();
  }, [route]);

  if (isRestoringSession) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Restoring secure session...</Text>
      </SafeAreaView>
    );
  }

  if (user) {
    return <AuthenticatedShell />;
  }

  switch (route) {
    case 'REGISTER':
      return <RegisterScreen onNavigate={setRoute} />;
    case 'LOGIN':
      return <LoginScreen onNavigate={setRoute} />;
    case 'WELCOME':
    default:
      return <WelcomeScreen onNavigate={setRoute} />;
  }
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  authenticatedSafeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentArea: {
    flex: 1,
  },
  bottomNavBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomNavBar: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  navTabButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTabButtonActive: {
    backgroundColor: '#EDE9FE',
  },
  navTabSosButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  navTabSosButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  navTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  navTabTextActive: {
    color: '#6D28D9',
    fontWeight: '800',
  },
  navTabSosText: {
    color: '#DC2626',
    fontWeight: '900',
  },
  navTabSosTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
