import React, { useEffect, ReactNode } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, Theme } from '../domain/types';
import { createTheme, lightTheme, darkTheme } from '../styles/theme';
import { useColorScheme, View } from 'react-native';

// ============================================================================
// Theme Store State
// ============================================================================

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  getSystemTheme: () => 'light' | 'dark';
}

// ============================================================================
// System Theme Detection
// ============================================================================

const getSystemColorScheme = (): 'light' | 'dark' => {
  // This will be called at runtime
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

// ============================================================================
// Theme Store
// ============================================================================

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      theme: lightTheme,

      setMode: (mode: ThemeMode) => {
        const systemTheme = get().getSystemTheme();
        const effectiveMode = mode === 'system' ? systemTheme : mode;
        set({
          mode,
          theme: createTheme(effectiveMode === 'dark'),
        });
      },

      toggleTheme: () => {
        const currentMode = get().mode;
        const systemTheme = get().getSystemTheme();
        const currentEffective = currentMode === 'system' ? systemTheme : currentMode;
        const newMode = currentEffective === 'light' ? 'dark' : 'light';
        set({
          mode: newMode,
          theme: createTheme(newMode === 'dark'),
        });
      },

      getSystemTheme: () => {
        return getSystemColorScheme();
      },
    }),
    {
      name: 'yaya-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-apply theme based on stored mode
          const systemTheme = getSystemColorScheme();
          const effectiveMode = state.mode === 'system' ? systemTheme : state.mode;
          state.theme = createTheme(effectiveMode === 'dark');
        }
      },
    }
  )
);

// ============================================================================
// Theme Hook
// ============================================================================

export const useTheme = () => {
  const { theme, mode, setMode, toggleTheme } = useThemeStore();

  return {
    theme,
    mode,
    setMode,
    toggleTheme,
    isDark: theme.mode === 'dark',
  };
};

// ============================================================================
// Theme Provider Component
// ============================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { mode, setMode } = useThemeStore();

  // Update theme when system preference changes
  useEffect(() => {
    if (mode === 'system' && systemColorScheme) {
      setMode('system');
    }
  }, [systemColorScheme, mode, setMode]);

  return <View style={{ flex: 1 }}>{children}</View>;
};

export default useThemeStore;
