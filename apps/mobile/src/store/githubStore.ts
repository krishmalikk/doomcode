import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface GitHubUser {
  login: string;
  avatarUrl: string;
  name?: string;
}

interface PRResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
}

interface GitHubState {
  // Auth state
  isAuthenticated: boolean;
  accessToken: string | null;
  tokenScope: string | null;
  tokenExpiresAt: number | null;
  user: GitHubUser | null;

  // Token sharing state
  tokenSharedWithDesktop: boolean;

  // PR creation state
  pendingPRRequest: string | null;
  lastPRResult: PRResult | null;

  // Actions
  setAuth: (token: string, scope: string, expiresAt?: number) => Promise<void>;
  setUser: (user: GitHubUser) => void;
  clearAuth: () => Promise<void>;
  markTokenShared: () => void;
  markTokenRevoked: () => void;
  setPendingPR: (requestId: string | null) => void;
  setPRResult: (result: PRResult | null) => void;
  loadToken: () => Promise<string | null>;
  clearPRResult: () => void;
}

const SECURE_TOKEN_KEY = 'github_access_token';

export const useGitHubStore = create<GitHubState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      accessToken: null,
      tokenScope: null,
      tokenExpiresAt: null,
      user: null,
      tokenSharedWithDesktop: false,
      pendingPRRequest: null,
      lastPRResult: null,

      setAuth: async (token, scope, expiresAt) => {
        // Store token securely
        await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
        set({
          isAuthenticated: true,
          accessToken: token,
          tokenScope: scope,
          tokenExpiresAt: expiresAt ?? null,
          tokenSharedWithDesktop: false,
        });
      },

      setUser: (user) => set({ user }),

      clearAuth: async () => {
        await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
        set({
          isAuthenticated: false,
          accessToken: null,
          tokenScope: null,
          tokenExpiresAt: null,
          user: null,
          tokenSharedWithDesktop: false,
        });
      },

      markTokenShared: () => set({ tokenSharedWithDesktop: true }),

      markTokenRevoked: () => set({ tokenSharedWithDesktop: false }),

      setPendingPR: (requestId) => set({ pendingPRRequest: requestId }),

      setPRResult: (result) =>
        set({
          lastPRResult: result,
          pendingPRRequest: null,
        }),

      clearPRResult: () => set({ lastPRResult: null }),

      loadToken: async () => {
        try {
          const token = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
          if (token) {
            set({ accessToken: token, isAuthenticated: true });
          }
          return token;
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'github-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive state; token is in SecureStore
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        tokenScope: state.tokenScope,
        tokenExpiresAt: state.tokenExpiresAt,
        user: state.user,
      }),
    }
  )
);
