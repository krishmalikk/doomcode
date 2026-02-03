import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeId } from '../constants/terminalThemes';

interface TerminalPrefsState {
  theme: ThemeId;
  fontSize: number;
  setTheme: (theme: ThemeId) => void;
  setFontSize: (size: number) => void;
}

export const useTerminalPrefsStore = create<TerminalPrefsState>()(
  persist(
    (set) => ({
      theme: 'default',
      fontSize: 10,

      setTheme: (theme) => set({ theme }),

      setFontSize: (fontSize) =>
        set({ fontSize: Math.min(18, Math.max(8, fontSize)) }),
    }),
    {
      name: 'terminal-prefs-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
