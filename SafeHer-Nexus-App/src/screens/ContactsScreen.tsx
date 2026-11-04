import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiClientError } from '../api/apiClient';
import {
  createEmergencyContactApi,
  deleteEmergencyContactApi,
  fetchEmergencyContactsApi,
  updateEmergencyContactApi,
} from '../api/contactApi';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  EmergencyContact,
  EmergencyContactPayload,
  MAX_CONTACTS_LIMIT,
} from '../types/contact';

const PHONE_REGEX = /^\+?[0-9\-\s()]{7,20}$/;
const EMAIL_REGEX = /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ContactsScreen: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteContact, setConfirmDeleteContact] =
    useState<EmergencyContact | null>(null);

  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);

  const [name, setName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [primaryContact, setPrimaryContact] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    setLoadingList(true);
    setErrorBanner(null);
    try {
      const list = await fetchEmergencyContactsApi();
      setContacts(list);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Unable to load trusted emergency contacts.'
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const resetForm = () => {
    setEditingContactId(null);
    setName('');
    setPhoneNumber('');
    setRelationship('');
    setEmail('');
    setPrimaryContact(false);
    setFieldErrors({});
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setErrorBanner(null);
    setStatusMessage(null);
    setPrimaryContact(contacts.length === 0);
    setShowForm(true);
  };

  const openEditForm = (contact: EmergencyContact) => {
    setErrorBanner(null);
    setStatusMessage(null);
    setConfirmDeleteContact(null);
    setEditingContactId(contact.id);
    setName(contact.name);
    setPhoneNumber(contact.phoneNumber);
    setRelationship(contact.relationship);
    setEmail(contact.email ?? '');
    setPrimaryContact(contact.primaryContact);
    setFieldErrors({});
    setShowForm(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) {
      errors.name = 'Contact name must be at least 2 characters';
    }
    if (!PHONE_REGEX.test(phoneNumber.trim())) {
      errors.phoneNumber =
        'Enter a valid phone number (7-20 digits, may include +, spaces, or hyphens)';
    }
    if (relationship.trim().length < 2) {
      errors.relationship =
        'Relationship is required (e.g. Mother, Sister, Friend)';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address or leave blank';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveContact = async () => {
    setErrorBanner(null);
    setStatusMessage(null);
    if (!validateForm()) {
      return;
    }

    const payload: EmergencyContactPayload = {
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      relationship: relationship.trim(),
      email: email.trim().length > 0 ? email.trim() : undefined,
      primaryContact,
    };

    setSubmitting(true);
    try {
      if (editingContactId !== null) {
        await updateEmergencyContactApi(editingContactId, payload);
        setStatusMessage('Trusted contact updated.');
      } else {
        await createEmergencyContactApi(payload);
        setStatusMessage('Trusted contact added to your circle.');
      }
      resetForm();
      await loadContacts();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.validationErrors) {
          setFieldErrors(err.validationErrors);
        }
        setErrorBanner(err.message);
      } else {
        setErrorBanner('Failed to save contact. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteContact) {
      return;
    }
    const targetId = confirmDeleteContact.id;
    setDeletingId(targetId);
    setErrorBanner(null);
    setStatusMessage(null);
    try {
      await deleteEmergencyContactApi(targetId);
      setConfirmDeleteContact(null);
      setStatusMessage('Trusted contact removed.');
      await loadContacts();
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Unable to delete contact.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text style={styles.heading}>Trusted Contacts</Text>
          <Text style={styles.subheading}>
            Add up to {MAX_CONTACTS_LIMIT} trusted people for future emergency
            workflows.
          </Text>
        </View>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {contacts.length} / {MAX_CONTACTS_LIMIT}
          </Text>
        </View>
      </View>

      {errorBanner ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorBanner}</Text>
        </View>
      ) : null}

      {statusMessage ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{statusMessage}</Text>
        </View>
      ) : null}

      {confirmDeleteContact ? (
        <View style={styles.deleteConfirmCard}>
          <Text style={styles.deleteConfirmTitle}>
            Delete Trusted Contact?
          </Text>
          <Text style={styles.deleteConfirmText}>
            Are you sure you want to remove{' '}
            <Text style={styles.boldText}>{confirmDeleteContact.name}</Text> (
            {confirmDeleteContact.relationship}) from your trusted contacts?
          </Text>
          <View style={styles.deleteActionsRow}>
            <View style={styles.halfButton}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setConfirmDeleteContact(null)}
                variant="secondary"
                disabled={deletingId !== null}
              />
            </View>
            <View style={styles.halfButton}>
              <PrimaryButton
                title="Confirm Delete"
                onPress={handleConfirmDelete}
                variant="danger"
                loading={deletingId === confirmDeleteContact.id}
              />
            </View>
          </View>
        </View>
      ) : null}

      {showForm ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingContactId !== null
              ? 'Edit Trusted Contact'
              : 'Add New Trusted Contact'}
          </Text>

          <FormInput
            label="Contact Person's Name *"
            placeholder="e.g. Sunita Sharma"
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: '' }));
              }
            }}
            errorMessage={fieldErrors.name}
          />

          <FormInput
            label="Phone Number *"
            placeholder="e.g. +91 9876543210"
            value={phoneNumber}
            onChangeText={(val) => {
              setPhoneNumber(val);
              if (fieldErrors.phoneNumber) {
                setFieldErrors((prev) => ({ ...prev, phoneNumber: '' }));
              }
            }}
            keyboardType="phone-pad"
            errorMessage={fieldErrors.phoneNumber}
          />

          <FormInput
            label="Relationship *"
            placeholder="e.g. Mother, Sister, Friend, Partner"
            value={relationship}
            onChangeText={(val) => {
              setRelationship(val);
              if (fieldErrors.relationship) {
                setFieldErrors((prev) => ({ ...prev, relationship: '' }));
              }
            }}
            errorMessage={fieldErrors.relationship}
          />

          <FormInput
            label="Email Address (Optional)"
            placeholder="contact@example.com"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: '' }));
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            errorMessage={fieldErrors.email}
          />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Designate as Primary Contact</Text>
              <Text style={styles.switchHint}>
                Only one contact is marked as primary at a time.
              </Text>
            </View>
            <Switch
              value={primaryContact}
              onValueChange={setPrimaryContact}
              trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
              thumbColor={primaryContact ? '#7C3AED' : '#F8FAFC'}
            />
          </View>

          <PrimaryButton
            title={
              editingContactId !== null ? 'Update Contact' : 'Save Contact'
            }
            onPress={handleSaveContact}
            loading={submitting}
          />

          <PrimaryButton
            title="Cancel"
            onPress={resetForm}
            disabled={submitting}
            variant="secondary"
          />
        </View>
      ) : (
        <PrimaryButton
          title={
            contacts.length >= MAX_CONTACTS_LIMIT
              ? `Maximum ${MAX_CONTACTS_LIMIT} Contacts Reached`
              : '+ Add Trusted Contact'
          }
          onPress={openAddForm}
          disabled={contacts.length >= MAX_CONTACTS_LIMIT}
        />
      )}

      {loadingList ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading trusted contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Trusted Contacts Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add family members or trusted friends so they are ready for future
            emergency workflows.
          </Text>
        </View>
      ) : (
        <View style={styles.listSection}>
          {contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactTopRow}>
                <View>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelation}>
                    {contact.relationship}
                  </Text>
                </View>
                {contact.primaryContact ? (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.contactDetail}>
                Phone: {contact.phoneNumber}
              </Text>
              {contact.email ? (
                <Text style={styles.contactDetail}>Email: {contact.email}</Text>
              ) : null}

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditForm(contact)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => setConfirmDeleteContact(contact)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  counterBadge: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  counterText: {
    color: '#6D28D9',
    fontSize: 13,
    fontWeight: '800',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteConfirmCard: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  deleteConfirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9F1239',
    marginBottom: 6,
  },
  deleteConfirmText: {
    fontSize: 13,
    color: '#881337',
    lineHeight: 19,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: '800',
  },
  deleteActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfButton: {
    flex: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  switchHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    marginTop: 10,
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  listSection: {
    marginTop: 14,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  contactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  contactRelation: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: 2,
  },
  primaryBadge: {
    backgroundColor: '#EDE9FE',
    borderColor: '#A78BFA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5B21B6',
  },
  contactDetail: {
    fontSize: 13,
    color: '#334155',
    marginTop: 3,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 14,
  },
  editButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#6D28D9',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
