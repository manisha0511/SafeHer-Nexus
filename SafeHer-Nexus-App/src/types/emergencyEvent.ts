export interface EmergencyEventLocationItem {
  id: number;
  emergencyEventId: number;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  altitudeMeters?: number | null;
  speedMps?: number | null;
  headingDegrees?: number | null;
  recordedAt: string;
  createdAt: string;
}

export interface EmergencyNotificationItem {
  id: number;
  emergencyEventId: number;
  emergencyContactId?: number | null;
  recipientPhone: string;
  recipientName: string;
  messageBody: string;
  status:
    | 'NOT_CONFIGURED'
    | 'QUEUED'
    | 'SENT'
    | 'DELIVERED'
    | 'FAILED'
    | string;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface EmergencyEventItem {
  id: number;
  eventType: 'SOS_ALERT' | 'LOCATION_SHARE' | 'SAFETY_CHECK_IN' | string;
  status: 'TRIGGERED' | 'ACTIVE' | 'RESOLVED' | 'CANCELLED' | 'FAILED' | string;
  notificationStatus:
    | 'NOT_CONFIGURED'
    | 'QUEUED'
    | 'SENT'
    | 'DELIVERED'
    | 'FAILED'
    | string;
  notificationStatusMessage: string;
  locationAttached: boolean;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  locationAccuracyMeters?: number | null;
  locationCapturedAt?: string | null;
  locationLabel?: string | null;
  notes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  locationUpdatesCount?: number;
  latestLocation?: EmergencyEventLocationItem | null;
  notifications?: EmergencyNotificationItem[];
}

export interface CreateSosEventPayload {
  latitude?: number;
  longitude?: number;
  locationAccuracyMeters?: number;
  locationCapturedAt?: string;
  locationLabel?: string;
  notes?: string;
}

export interface RecordLocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  altitudeMeters?: number;
  speedMps?: number;
  headingDegrees?: number;
  recordedAt?: string;
}

export interface ResolveEmergencyEventPayload {
  resolutionNotes?: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
