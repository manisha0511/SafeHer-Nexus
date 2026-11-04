import { HealthResponseDto } from '../types/health';
import { apiRequest } from './apiClient';

export async function fetchBackendHealth(): Promise<HealthResponseDto> {
  return apiRequest<HealthResponseDto>('/api/v1/health', {
    method: 'GET',
    timeoutMs: 6000,
  });
}
