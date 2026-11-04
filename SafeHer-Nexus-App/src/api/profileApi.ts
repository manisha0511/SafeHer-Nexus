import { getAccessToken } from '../storage/tokenStorage';
import { UpdateUserProfilePayload, UserProfile } from '../types/auth';
import { ApiClientError, apiRequest } from './apiClient';

async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiClientError('Authentication token missing. Please sign in.', 401);
  }
  return token;
}

export async function fetchMyProfileApi(): Promise<UserProfile> {
  const token = await requireToken();
  return apiRequest<UserProfile>('/api/users/me', {
    method: 'GET',
    token,
  });
}

export async function updateMyProfileApi(
  payload: UpdateUserProfilePayload
): Promise<UserProfile> {
  const token = await requireToken();
  return apiRequest<UserProfile>('/api/users/me', {
    method: 'PUT',
    body: payload,
    token,
  });
}
