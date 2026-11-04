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

interface RegisterScreenProps {
  onNavigate: (route: UnauthenticatedRoute) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigate,
}) => {
  const { register, isSubmitting } = useAuth();

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    setBannerError(null);
    if (!validateClientSide()) {
      return;
    }

    try {
      await register({
        name: name.trim(),
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
        setBannerError('Registration failed. Please try again.');
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

          <Text style={styles.heading}>Create Your Account</Text>
          <Text style={styles.subheading}>
            Register with SafeHer Nexus to access your personal safety dashboard.
          </Text>

          {bannerError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{bannerError}</Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <FormInput
              label="Full Name"
              placeholder="e.g. Ananya Sharma"
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              autoCapitalize="words"
              errorMessage={fieldErrors.name}
            />

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
              label="Password (min. 8 characters)"
              placeholder="Enter a strong password"
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

            <FormInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              errorMessage={fieldErrors.confirmPassword}
            />

            <PrimaryButton
              title="Create Account"
              onPress={handleRegister}
              loading={isSubmitting}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => onNavigate('LOGIN')}>
              <Text style={styles.footerLink}>Sign In</Text>
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
