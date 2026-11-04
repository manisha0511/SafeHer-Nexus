import { getAccessToken } from '../storage/tokenStorage';
import {
  CreateSosEventPayload,
  EmergencyEventItem,
  EmergencyEventLocationItem,
  EmergencyNotificationItem,
  PagedResponse,
  RecordLocationUpdatePayload,
  ResolveEmergencyEventPayload,
} from '../types/emergencyEvent';
import { ApiClientError, apiRequest } from './apiClient';

async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiClientError(
      'Authentication token missing. Please sign in.',
      401
    );
  }
  return token;
}

export async function createSosEventApi(
  payload: CreateSosEventPayload
): Promise<EmergencyEventItem> {
  const token = await requireToken();
  return apiRequest<EmergencyEventItem>('/api/emergency-events', {
    method: 'POST',
    body: payload,
    token,
  });
}

export async function fetchActiveEmergencyEventApi(): Promise<EmergencyEventItem | null> {
  const token = await requireToken();
  const result = await apiRequest<EmergencyEventItem | null>(
    '/api/emergency-events/active',
    {
      method: 'GET',
      token,
    }
  );
  return result ?? null;
}

export async function resolveEmergencyEventApi(
  eventId: number,
  payload: ResolveEmergencyEventPayload = {}
): Promise<EmergencyEventItem> {
  const token = await requireToken();
  return apiRequest<EmergencyEventItem>(
    `/api/emergency-events/${eventId}/resolve`,
    {
      method: 'POST',
      body: payload,
      token,
    }
  );
}

export async function fetchEmergencyEventsApi(
  page = 0,
  size = 10
): Promise<PagedResponse<EmergencyEventItem>> {
  const token = await requireToken();
  return apiRequest<PagedResponse<EmergencyEventItem>>(
    `/api/emergency-events?page=${page}&size=${size}`,
    {
      method: 'GET',
      token,
    }
  );
}

export async function fetchEmergencyEventByIdApi(
  eventId: number
): Promise<EmergencyEventItem> {
  const token = await requireToken();
  return apiRequest<EmergencyEventItem>(`/api/emergency-events/${eventId}`, {
    method: 'GET',
    token,
  });
}

export async function recordLocationUpdateApi(
  eventId: number,
  payload: RecordLocationUpdatePayload
): Promise<EmergencyEventLocationItem> {
  const token = await requireToken();
  return apiRequest<EmergencyEventLocationItem>(
    `/api/emergency-events/${eventId}/locations`,
    {
      method: 'POST',
      body: payload,
      token,
    }
  );
}

export async function fetchEventLocationsApi(
  eventId: number
): Promise<EmergencyEventLocationItem[]> {
  const token = await requireToken();
  return apiRequest<EmergencyEventLocationItem[]>(
    `/api/emergency-events/${eventId}/locations`,
    {
      method: 'GET',
      token,
    }
  );
}

export async function fetchEventNotificationsApi(
  eventId: number
): Promise<EmergencyNotificationItem[]> {
  const token = await requireToken();
  return apiRequest<EmergencyNotificationItem[]>(
    `/api/emergency-events/${eventId}/notifications`,
    {
      method: 'GET',
      token,
    }
  );
}
