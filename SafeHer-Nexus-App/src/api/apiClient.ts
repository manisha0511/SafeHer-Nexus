import { API_BASE_URL } from '../config/env';
import { ApiErrorResponse } from '../types/auth';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly validationErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    validationErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
}

export async function apiRequest<T>(
  endpointPath: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token, timeoutMs = 10000 } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  const normalizedPath = endpointPath.startsWith('/')
    ? endpointPath
    : `/${endpointPath}`;
  const fullUrl = `${API_BASE_URL}${normalizedPath}`;

  try {
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsedJson: unknown = null;

    if (rawText.length > 0) {
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        parsedJson = null;
      }
    }

    if (!response.ok) {
      const errPayload = parsedJson as Partial<ApiErrorResponse> | null;
      const serverMessage =
        errPayload?.message ||
        `Request failed with status ${response.status}`;

      throw new ApiClientError(
        serverMessage,
        response.status,
        errPayload?.validationErrors
      );
    }

    return parsedJson as T;
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        `Connection timed out while reaching ${API_BASE_URL}. Please verify the backend is running.`,
        0
      );
    }

    throw new ApiClientError(
      `Unable to reach the SafeHer Nexus backend at ${API_BASE_URL}. Ensure the Spring Boot server is running and EXPO_PUBLIC_API_BASE_URL is configured for your device.`,
      0
    );
  } finally {
    clearTimeout(timerId);
  }
}
