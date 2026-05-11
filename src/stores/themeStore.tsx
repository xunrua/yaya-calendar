// 主题状态管理 Store

import AsyncStorage from "@react-native-async-storage/async-storage";
import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Appearance, StyleSheet, useColorScheme, View } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Theme, ThemeMode } from "../domain/types";
import { createTheme, lightTheme } from "../styles/theme";

// ============================================================================
// 主题 Store 状态
// ============================================================================

interface ThemeState {
  mode: ThemeMode; // 主题模式：light、dark、system
  theme: Theme; // 当前主题对象
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  getSystemTheme: () => "light" | "dark";
}

// ============================================================================
// 系统主题检测
// ============================================================================

/** 获取系统当前颜色模式 */
const getSystemColorScheme = (): "light" | "dark" => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
};

// ============================================================================
// 主题 Store
// ============================================================================

/** 主题状态管理 Store，支持持久化存储 */
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
// 主题 Hook
// ============================================================================

/**
 * 获取主题数据的 Hook
 * @returns 主题对象、模式、设置方法、是否深色模式
 */
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
// 主题提供者组件（带过渡动画）
// ============================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * 主题提供者组件
 * 提供主题切换时的淡入淡出动画效果
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { mode, setMode, theme } = useThemeStore();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevModeRef = useRef(mode);

  // 主题切换动画
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      // 淡出
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 100, // 淡出时长
        useNativeDriver: true,
      }).start(() => {
        // 淡入
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200, // 淡入时长
          useNativeDriver: true,
        }).start();
      });
    }
    prevModeRef.current = mode;
  }, [mode, fadeAnim]);

  // 系统主题变化时更新
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
