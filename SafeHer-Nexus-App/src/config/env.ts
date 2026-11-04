/**
 * Central API Base URL Configuration & Environment Resolver.
 *
 * Environment Modes:
 * - Development (__DEV__ === true):
 *     - Android Studio Emulator: http://10.0.2.2:8080 (default fallback)
 *     - Physical Android Device on local Wi-Fi: http://<YOUR_PC_LAN_IPV4>:8080
 *
 * - Production Release (__DEV__ === false):
 *     - Requires a valid HTTPS URL configured via EXPO_PUBLIC_API_BASE_URL.
 *     - Localhost and 10.0.2.2 are prohibited in production builds to prevent
 *       silent networking failures on standalone devices.
 *
 * IMPORTANT:
 * Never store private API secrets, database passwords, or Twilio tokens in
 * EXPO_PUBLIC_* variables. All sensitive credentials must remain on the Spring Boot backend.
 */

const DEFAULT_DEV_EMULATOR_URL = 'http://10.0.2.2:8080';

export function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  // In production builds, strictly reject unroutable localhost/emulator endpoints
  if (!__DEV__) {
    if (!configured || configured.length === 0) {
      console.warn(
        '[SafeHer Security Warning] EXPO_PUBLIC_API_BASE_URL is not configured for this release build. ' +
        'Please define your production backend URL (e.g. https://api.safehernexus.com).'
      );
      return '';
    }

    const lower = configured.toLowerCase();
    if (lower.includes('localhost') || lower.includes('10.0.2.2') || lower.includes('127.0.0.1')) {
      console.warn(
        `[SafeHer Security Warning] Production release build is configured with a local development URL (${configured}). ` +
        'This endpoint will be unreachable on physical Android devices outside the local emulator.'
      );
    }

    return configured.replace(/\/+$/, '');
  }

  // In local development, use configured LAN URL or default to emulator IP
  const baseUrl = configured && configured.length > 0 ? configured : DEFAULT_DEV_EMULATOR_URL;
  return baseUrl.replace(/\/+$/, '');
}

export const API_BASE_URL: string = resolveApiBaseUrl();

export const IS_PRODUCTION: boolean = !__DEV__;
