import AsyncStorage from "@react-native-async-storage/async-storage";
import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Appearance, StyleSheet, useColorScheme, View } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Theme, ThemeMode } from "../domain/types";
import { createTheme, lightTheme } from "../styles/theme";

// ============================================================================
// Theme Store State
// ============================================================================

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  getSystemTheme: () => "light" | "dark";
}

// ============================================================================
// System Theme Detection
// ============================================================================

const getSystemColorScheme = (): "light" | "dark" => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
};

// ============================================================================
// Theme Store
// ============================================================================

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      theme: lightTheme,

      setMode: (mode: ThemeMode) => {
        const systemTheme = get().getSystemTheme();
        const effectiveMode = mode === "system" ? systemTheme : mode;
        set({
          mode,
          theme: createTheme(effectiveMode === "dark"),
        });
      },

      toggleTheme: () => {
        const currentMode = get().mode;
        const systemTheme = get().getSystemTheme();
        const currentEffective = currentMode === "system" ? systemTheme : currentMode;
        const newMode = currentEffective === "light" ? "dark" : "light";
        set({
          mode: newMode,
          theme: createTheme(newMode === "dark"),
        });
      },

      getSystemTheme: () => {
        return getSystemColorScheme();
      },
    }),
    {
      name: "yaya-theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-apply theme based on stored mode
          const systemTheme = getSystemColorScheme();
          const effectiveMode = state.mode === "system" ? systemTheme : state.mode;
          state.theme = createTheme(effectiveMode === "dark");
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
    isDark: theme.mode === "dark",
  };
};

// ============================================================================
// Theme Provider Component with Animation
// ============================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { mode, setMode, theme } = useThemeStore();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevModeRef = useRef(mode);

  // Animate theme transition
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
    prevModeRef.current = mode;
  }, [mode, fadeAnim]);

  // Update theme when system preference changes
  useEffect(() => {
    if (mode === "system" && systemColorScheme) {
      setMode("system");
    }
  }, [systemColorScheme, mode, setMode]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default useThemeStore;
