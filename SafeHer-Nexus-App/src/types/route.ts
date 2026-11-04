export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  roadName: string;
  safetyNote: string;
}

export interface RouteAlternative {
  routeId: string;
  summary: string;
  recommended: boolean;
  recommendationReason: string;
  distanceMeters: number;
  durationSeconds: number;
  distanceFormatted: string;
  durationFormatted: string;
  safetyPrecautions: string[];
  steps: RouteStep[];
  googleMapsNavigationUrl: string;
}

export interface RouteRecommendationRequest {
  origin?: string;
  destination: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  travelMode?: 'DRIVING' | 'WALKING' | 'TRANSIT';
}

export interface RouteRecommendationResponse {
  origin: string;
  destination: string;
  travelMode: string;
  provider: string;
  routes: RouteAlternative[];
  disclaimer: string;
  emergencyHelplines: Record<string, string>;
}
