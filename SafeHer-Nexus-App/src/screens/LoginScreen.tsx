import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiClientError } from '../api/apiClient';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { UnauthenticatedRoute } from '../types/auth';

interface LoginScreenProps {
  onNavigate: (route: UnauthenticatedRoute) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const { login, isSubmitting } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setBannerError(null);
    if (!validateClientSide()) {
      return;
    }

    try {
      await login({
        email: email.trim(),
        password,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.validationErrors) {
          setFieldErrors(err.validationErrors);
        }
        setBannerError(err.message);
      } else {
        setBannerError('Sign in failed. Please check your credentials and try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => onNavigate('WELCOME')}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back to Welcome</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading}>
            Sign in to your SafeHer Nexus account to access your safety tools.
          </Text>

          {bannerError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{bannerError}</Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <FormInput
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              errorMessage={fieldErrors.email}
            />

            <FormInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              errorMessage={fieldErrors.password}
            />

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={isSubmitting}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to SafeHer Nexus? </Text>
            <TouchableOpacity onPress={() => onNavigate('REGISTER')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  backButton: {
    marginBottom: 14,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '600',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 18,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#475569',
  },
  footerLink: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '700',
  },
});
