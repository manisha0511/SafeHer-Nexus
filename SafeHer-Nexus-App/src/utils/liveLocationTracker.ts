import * as Location from 'expo-location';
import { recordLocationUpdateApi } from '../api/emergencyEventApi';
import {
  EmergencyEventLocationItem,
  RecordLocationUpdatePayload,
} from '../types/emergencyEvent';
import { areValidCoordinates } from './locationCapture';

export type LiveTrackingStatus =
  | 'INITIALIZING'
  | 'TRACKING_ACTIVE'
  | 'OFFLINE_RETRY'
  | 'PERMISSION_DENIED'
  | 'GPS_UNAVAILABLE'
  | 'STOPPED';

export interface LiveTrackingState {
  status: LiveTrackingStatus;
  statusMessage: string;
  latestLatitude?: number;
  latestLongitude?: number;
  latestAccuracyMeters?: number;
  lastSuccessfulSyncIso?: string;
  updateCount: number;
}

export class LiveLocationTracker {
  private eventId: number;
  private intervalMs: number;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private onStateChange: (state: LiveTrackingState) => void;
  private isRunning: boolean = false;
  private updateCount: number = 0;
  private latestCoords?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };

  constructor(
    eventId: number,
    onStateChange: (state: LiveTrackingState) => void,
    intervalMs: number = 15000
  ) {
    this.eventId = eventId;
    this.onStateChange = onStateChange;
    this.intervalMs = intervalMs;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.updateCount = 0;

    this.onStateChange({
      status: 'INITIALIZING',
      statusMessage: 'Requesting location permissions for continuous tracking...',
      updateCount: 0,
    });

    try {
      // 1. Check and request foreground permission
      const fgResponse = await Location.requestForegroundPermissionsAsync();
      if (fgResponse.status !== 'granted') {
        this.onStateChange({
          status: 'PERMISSION_DENIED',
          statusMessage:
            'Foreground location permission was denied. Continuous SOS tracking is unavailable without permission.',
          updateCount: 0,
        });
        this.isRunning = false;
        return;
      }

      // 2. Request background permission gracefully (non-fatal if rejected)
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch {
        // Safe fallback: continue with active foreground tracking
      }

      // 3. Immediately trigger first coordinate capture
      await this.captureAndSendLocation();

      // 4. Start periodic location capture loop
      this.timerId = setInterval(() => {
        if (!this.isRunning) {
          if (this.timerId) clearInterval(this.timerId);
          return;
        }
        this.captureAndSendLocation();
      }, this.intervalMs);
    } catch (err: unknown) {
      this.onStateChange({
        status: 'GPS_UNAVAILABLE',
        statusMessage:
          err instanceof Error
            ? `Tracking initialization failed: ${err.message}`
            : 'GPS service is unavailable.',
        updateCount: 0,
      });
      this.isRunning = false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.onStateChange({
      status: 'STOPPED',
      statusMessage: 'Live tracking stopped because the SOS event is no longer active.',
      latestLatitude: this.latestCoords?.latitude,
      latestLongitude: this.latestCoords?.longitude,
      latestAccuracyMeters: this.latestCoords?.accuracyMeters,
      updateCount: this.updateCount,
    });
  }

  private async captureAndSendLocation(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy, altitude, speed, heading } =
        position.coords;

      if (!areValidCoordinates(latitude, longitude)) {
        this.onStateChange({
          status: 'GPS_UNAVAILABLE',
          statusMessage: 'Device GPS returned invalid coordinates.',
          updateCount: this.updateCount,
        });
        return;
      }

      const validAccuracy =
        typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0
          ? Math.round(accuracy * 10) / 10
          : undefined;

      const roundedLat = Math.round(latitude * 1000000) / 1000000;
      const roundedLon = Math.round(longitude * 1000000) / 1000000;

      this.latestCoords = {
        latitude: roundedLat,
        longitude: roundedLon,
        accuracyMeters: validAccuracy,
      };

      const payload: RecordLocationUpdatePayload = {
        latitude: roundedLat,
        longitude: roundedLon,
        accuracyMeters: validAccuracy,
        altitudeMeters:
          typeof altitude === 'number' && Number.isFinite(altitude)
            ? Math.round(altitude * 10) / 10
            : undefined,
        speedMps:
          typeof speed === 'number' && Number.isFinite(speed) && speed >= 0
            ? Math.round(speed * 10) / 10
            : undefined,
        headingDegrees:
          typeof heading === 'number' && Number.isFinite(heading) && heading >= 0
            ? Math.round(heading * 10) / 10
            : undefined,
        recordedAt: new Date(position.timestamp || Date.now()).toISOString(),
      };

      // Transmit to SafeHer Nexus backend
      await recordLocationUpdateApi(this.eventId, payload);

      this.updateCount += 1;

      this.onStateChange({
        status: 'TRACKING_ACTIVE',
        statusMessage: 'GPS tracking active and synced with SafeHer Nexus.',
        latestLatitude: roundedLat,
        latestLongitude: roundedLon,
        latestAccuracyMeters: validAccuracy,
        lastSuccessfulSyncIso: new Date().toISOString(),
        updateCount: this.updateCount,
      });
    } catch (err: unknown) {
      // Network drop or temporary server error: retain last coordinates and report retry
      this.onStateChange({
        status: 'OFFLINE_RETRY',
        statusMessage:
          err instanceof Error
            ? `Sync dropped (${err.message}). Retrying on next GPS cycle...`
            : 'Network connection dropped. Retrying on next GPS cycle...',
        latestLatitude: this.latestCoords?.latitude,
        latestLongitude: this.latestCoords?.longitude,
        latestAccuracyMeters: this.latestCoords?.accuracyMeters,
        updateCount: this.updateCount,
      });
    }
  }
}
