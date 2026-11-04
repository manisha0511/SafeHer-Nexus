import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from '../types/auth';
import { apiRequest } from './apiClient';

export async function registerUserApi(
  payload: RegisterPayload
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function loginUserApi(
  payload: LoginPayload
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchCurrentUserApi(token: string): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/auth/me', {
    method: 'GET',
    token,
  });
}
