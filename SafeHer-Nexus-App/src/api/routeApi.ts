import { getAccessToken } from '../storage/tokenStorage';
import {
  RouteRecommendationRequest,
  RouteRecommendationResponse,
} from '../types/route';
import { ApiClientError, apiRequest } from './apiClient';

const FALLBACK_DISCLAIMER =
  'Route recommendations prioritize well-trafficked major arterial roads and transit corridors. ' +
  'SafeHer does not guarantee absolute safety, road conditions, or real-time police presence. ' +
  'Always remain vigilant, stay aware of surroundings, and call 112 immediately in case of emergency.';

export async function fetchRouteRecommendationsApi(
  payload: RouteRecommendationRequest
): Promise<RouteRecommendationResponse> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiClientError('Authentication required to access Route Recommendations', 401);
  }

  try {
    return await apiRequest<RouteRecommendationResponse>(
      '/api/routes/recommendations',
      {
        method: 'POST',
        body: payload,
        token,
        timeoutMs: 12000,
      }
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Graceful offline fallback
    const origin = payload.origin || 'Current Location';
    const dest = payload.destination;
    const gUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(dest)}&travelmode=${(
      payload.travelMode || 'DRIVING'
    ).toLowerCase()}`;

    return {
      origin,
      destination: dest,
      travelMode: payload.travelMode || 'DRIVING',
      provider: 'OFFLINE_FALLBACK',
      routes: [
        {
          routeId: 'offline-fallback-corridor',
          summary: `Primary route towards ${dest}`,
          recommended: true,
          recommendationReason:
            'Offline guidance: Prioritize wide main roads, transit routes, and well-lit commercial streets.',
          distanceMeters: 0,
          durationSeconds: 0,
          distanceFormatted: 'Live map available',
          durationFormatted: 'Live map available',
          safetyPrecautions: [
            'Share trip details with your trusted contact before starting.',
            'Keep your phone battery charged and accessible.',
            'Stay on well-lit sidewalks and open roads.',
            'Keep the SafeHer SOS trigger ready if you feel unsafe.',
          ],
          steps: [
            {
              instruction: `Start from ${origin}`,
              distanceMeters: 0,
              durationSeconds: 0,
              roadName: 'Origin',
              safetyNote: 'Ensure you depart from a well-lit area',
            },
            {
              instruction: `Follow designated main arterial roads to ${dest}`,
              distanceMeters: 0,
              durationSeconds: 0,
              roadName: 'Main Arterial Corridor',
              safetyNote: 'Stay on main roads with visible street lighting',
            },
          ],
          googleMapsNavigationUrl: gUrl,
        },
      ],
      disclaimer: FALLBACK_DISCLAIMER,
      emergencyHelplines: {
        'National Emergency': '112',
        'Women Helpline (All India)': '1091',
        'Women in Distress': '181',
      },
    };
  }
}
