import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  fetchCurrentUserApi,
  loginUserApi,
  registerUserApi,
} from '../api/authApi';
import {
  clearAccessToken,
  getAccessToken,
  saveAccessToken,
} from '../storage/tokenStorage';
import {
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from '../types/auth';

interface AuthContextValue {
  user: UserProfile | null;
  isRestoringSession: boolean;
  isSubmitting: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  refreshProfile: () => Promise<UserProfile>;
  syncUserProfile: (updated: UserProfile) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedToken = await getAccessToken();
        if (!storedToken) {
          return;
        }
        const profile = await fetchCurrentUserApi(storedToken);
        if (isMounted) {
          setUser(profile);
        }
      } catch {
        await clearAccessToken();
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsRestoringSession(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsSubmitting(true);
    try {
      const response = await registerUserApi(payload);
      await saveAccessToken(response.accessToken);
      setUser(response.user);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsSubmitting(true);
    try {
      const response = await loginUserApi(payload);
      await saveAccessToken(response.accessToken);
      setUser(response.user);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserProfile> => {
    const storedToken = await getAccessToken();
    if (!storedToken) {
      await clearAccessToken();
      setUser(null);
      throw new Error('No active session token found. Please sign in again.');
    }
    const profile = await fetchCurrentUserApi(storedToken);
    setUser(profile);
    return profile;
  }, []);

  const syncUserProfile = useCallback((updated: UserProfile) => {
    setUser(updated);
  }, []);

  const logout = useCallback(async () => {
    await clearAccessToken();
    setUser(null);
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      isRestoringSession,
      isSubmitting,
      register,
      login,
      refreshProfile,
      syncUserProfile,
      logout,
    }),
    [
      user,
      isRestoringSession,
      isSubmitting,
      register,
      login,
      refreshProfile,
      syncUserProfile,
      logout,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
