import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiClientError } from '../api/apiClient';
import { fetchMyProfileApi, updateMyProfileApi } from '../api/profileApi';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

const PHONE_REGEX = /^$|^\+?[0-9\-\s()]{7,20}$/;

export const ProfileScreen: React.FC = () => {
  const { user, syncUserProfile } = useAuth();

  const [name, setName] = useState<string>(user?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState<string>(
    user?.phoneNumber ?? ''
  );
  const [safetyNote, setSafetyNote] = useState<string>(user?.safetyNote ?? '');

  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setErrorBanner(null);
    try {
      const profile = await fetchMyProfileApi();
      syncUserProfile(profile);
      setName(profile.name ?? '');
      setPhoneNumber(profile.phoneNumber ?? '');
      setSafetyNote(profile.safetyNote ?? '');
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Unable to load your profile.'
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [syncUserProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedPhone = phoneNumber.trim();

    if (trimmedName.length < 2) {
      errors.name = 'Name must be between 2 and 100 characters';
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.phoneNumber =
        'Phone number must be 7-20 digits and may include +, spaces, hyphens, or parentheses';
    }
    if (safetyNote.trim().length > 250) {
      errors.safetyNote = 'Safety note must not exceed 250 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    setErrorBanner(null);
    setSuccessBanner(null);
    if (!validateClientSide()) {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfileApi({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        safetyNote: safetyNote.trim(),
      });
      syncUserProfile(updated);
      setName(updated.name);
      setPhoneNumber(updated.phoneNumber ?? '');
      setSafetyNote(updated.safetyNote ?? '');
      setSuccessBanner('Profile updated successfully.');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.validationErrors) {
          setFieldErrors(err.validationErrors);
        }
        setErrorBanner(err.message);
      } else {
        setErrorBanner('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>My Safety Profile</Text>
      <Text style={styles.subheading}>
        Manage your personal details and emergency medical or safety notes.
      </Text>

      {loadingProfile ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading profile from server...</Text>
        </View>
      ) : null}

      {errorBanner ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorBanner}</Text>
        </View>
      ) : null}

      {successBanner ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successBanner}</Text>
        </View>
      ) : null}

      <View style={styles.readOnlyCard}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Account Email (Verified)</Text>
          <Text style={styles.metaValue}>{user?.email}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Role</Text>
          <Text style={styles.metaValue}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <FormInput
          label="Full Name *"
          placeholder="Your full name"
          value={name}
          onChangeText={(val) => {
            setName(val);
            setSuccessBanner(null);
            if (fieldErrors.name) {
              setFieldErrors((prev) => ({ ...prev, name: '' }));
            }
          }}
          errorMessage={fieldErrors.name}
        />

        <FormInput
          label="Personal Phone Number (Optional)"
          placeholder="e.g. +91 9876543210"
          value={phoneNumber}
          onChangeText={(val) => {
            setPhoneNumber(val);
            setSuccessBanner(null);
            if (fieldErrors.phoneNumber) {
              setFieldErrors((prev) => ({ ...prev, phoneNumber: '' }));
            }
          }}
          keyboardType="phone-pad"
          errorMessage={fieldErrors.phoneNumber}
        />

        <FormInput
          label="Personal Safety / Medical Note (Optional, max 250 chars)"
          placeholder="e.g. Blood group O+, allergic to penicillin"
          value={safetyNote}
          onChangeText={(val) => {
            setSafetyNote(val);
            setSuccessBanner(null);
            if (fieldErrors.safetyNote) {
              setFieldErrors((prev) => ({ ...prev, safetyNote: '' }));
            }
          }}
          multiline
          numberOfLines={3}
          errorMessage={fieldErrors.safetyNote}
        />

        <PrimaryButton
          title="Save Profile Changes"
          onPress={handleSaveProfile}
          loading={saving}
        />

        <PrimaryButton
          title="Reload Profile from Server"
          onPress={loadProfile}
          disabled={loadingProfile || saving}
          variant="secondary"
        />
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
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
    lineHeight: 20,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },
  readOnlyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
