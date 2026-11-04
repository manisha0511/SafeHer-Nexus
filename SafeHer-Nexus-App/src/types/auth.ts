export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string | null;
  safetyNote?: string | null;
  role: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateUserProfilePayload {
  name: string;
  phoneNumber?: string;
  safetyNote?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  user: UserProfile;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ApiErrorResponse {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string;
  validationErrors?: Record<string, string>;
}

export type UnauthenticatedRoute = 'WELCOME' | 'LOGIN' | 'REGISTER';

export type AuthenticatedTab =
  | 'DASHBOARD'
  | 'SOS'
  | 'FAKECALL'
  | 'SAFETY_TIPS'
  | 'AI_ASSISTANT'
  | 'ROUTES'
  | 'PROFILE'
  | 'CONTACTS'
  | 'HISTORY';
