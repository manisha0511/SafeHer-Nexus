import * as Location from 'expo-location';

export type LocationCaptureResult =
  | {
      status: 'CAPTURED';
      latitude: number;
      longitude: number;
      accuracyMeters?: number;
      capturedAtIso: string;
      message: string;
    }
  | {
      status: 'DENIED' | 'UNAVAILABLE';
      message: string;
    };

export function areValidCoordinates(
  latitude: unknown,
  longitude: unknown
): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Requests foreground location permission when needed and captures a single
 * coordinate snapshot for an SOS emergency event.
 * Never requests background location permission or continuous tracking.
 */
export async function captureForegroundLocationForSos(): Promise<LocationCaptureResult> {
  try {
    const permissionResponse =
      await Location.requestForegroundPermissionsAsync();

    if (permissionResponse.status !== 'granted') {
      return {
        status: 'DENIED',
        message:
          'Foreground location permission was not granted. You may still proceed to record your SOS event without location coordinates.',
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude, accuracy } = position.coords;

    if (!areValidCoordinates(latitude, longitude)) {
      return {
        status: 'UNAVAILABLE',
        message:
          'Device returned invalid coordinates. Your SOS event can still be recorded without coordinates.',
      };
    }

    const validAccuracy =
      typeof accuracy === 'number' &&
      Number.isFinite(accuracy) &&
      accuracy >= 0 &&
      accuracy <= 50000
        ? Math.round(accuracy * 10) / 10
        : undefined;

    const capturedAtIso = position.timestamp
      ? new Date(position.timestamp).toISOString()
      : new Date().toISOString();

    return {
      status: 'CAPTURED',
      latitude: Math.round(latitude * 1000000) / 1000000,
      longitude: Math.round(longitude * 1000000) / 1000000,
      accuracyMeters: validAccuracy,
      capturedAtIso,
      message: 'Foreground GPS coordinates captured and validated.',
    };
  } catch {
    return {
      status: 'UNAVAILABLE',
      message:
        'Could not obtain GPS coordinates from the device. You can still submit the SOS event without coordinates.',
    };
  }
}
