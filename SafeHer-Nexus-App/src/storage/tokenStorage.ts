import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'safeher_nexus_jwt_access_token';

/**
 * In-memory fallback used ONLY if running on a platform where native Keystore/Keychain
 * is unavailable (e.g., Expo Web preview). On Android & iOS, expo-secure-store is used.
 */
let memoryFallbackToken: string | null = null;

async function isSecureStoreSupported(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveAccessToken(token: string): Promise<void> {
  if (await isSecureStoreSupported()) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return;
  }
  memoryFallbackToken = token;
}

export async function getAccessToken(): Promise<string | null> {
  if (await isSecureStoreSupported()) {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }
  return memoryFallbackToken;
}

export async function clearAccessToken(): Promise<void> {
  if (await isSecureStoreSupported()) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    return;
  }
  memoryFallbackToken = null;
}
