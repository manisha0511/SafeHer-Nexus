import { getAccessToken } from '../storage/tokenStorage';
import { EmergencyContact, EmergencyContactPayload } from '../types/contact';
import { ApiClientError, apiRequest } from './apiClient';

async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiClientError('Authentication token missing. Please sign in.', 401);
  }
  return token;
}

export async function fetchEmergencyContactsApi(): Promise<EmergencyContact[]> {
  const token = await requireToken();
  return apiRequest<EmergencyContact[]>('/api/emergency-contacts', {
    method: 'GET',
    token,
  });
}

export async function createEmergencyContactApi(
  payload: EmergencyContactPayload
): Promise<EmergencyContact> {
  const token = await requireToken();
  return apiRequest<EmergencyContact>('/api/emergency-contacts', {
    method: 'POST',
    body: payload,
    token,
  });
}

export async function updateEmergencyContactApi(
  contactId: number,
  payload: EmergencyContactPayload
): Promise<EmergencyContact> {
  const token = await requireToken();
  return apiRequest<EmergencyContact>(`/api/emergency-contacts/${contactId}`, {
    method: 'PUT',
    body: payload,
    token,
  });
}

export async function deleteEmergencyContactApi(
  contactId: number
): Promise<void> {
  const token = await requireToken();
  await apiRequest<void>(`/api/emergency-contacts/${contactId}`, {
    method: 'DELETE',
    token,
  });
}
