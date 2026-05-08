import { Theme, ThemeColors } from '../domain/types';

// ============================================================================
// Light Theme Colors
// ============================================================================

const lightColors: ThemeColors = {
  primary: '#8B5CF6', // Violet 500 - 柔和紫色
  primaryLight: '#A78BFA', // Violet 400
  primaryDark: '#7C3AED', // Violet 600
  background: '#FAFAFA', // 米白色
  surface: '#F5F5F5', // 更柔和的灰色
  surfaceVariant: '#EBEBEB', // Gray 100
  text: '#1F2937', // Gray 800 - 深灰文字
  textSecondary: '#6B7280', // Gray 500
  textTertiary: '#9CA3AF', // Gray 400
  border: '#E5E7EB', // Gray 200
  error: '#EF4444', // Red 500
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  // Calendar specific
  todayBackground: '#EDE9FE', // Violet 100
  todayText: '#7C3AED', // Violet 600
  selectedBackground: '#F3E8FF', // Violet 50
  selectedText: '#6D28D9', // Violet 700
  eventDefault: '#8B5CF6', // Violet 500
  weekendText: '#DC2626', // Red 600
  lunarText: '#9CA3AF', // Gray 400 - 更淡的农历文字
  holidayText: '#DC2626', // Red 600
  solarTermText: '#059669', // Emerald 600
};

// ============================================================================
// Dark Theme Colors
// ============================================================================

const darkColors: ThemeColors = {
  primary: '#A78BFA', // Violet 400 - 去饱和紫色
  primaryLight: '#C4B5FD', // Violet 300
  primaryDark: '#8B5CF6', // Violet 500
  background: '#1C1C1E', // 深灰背景 (iOS 风格)
  surface: '#2C2C2E', // 稍浅的灰色
  surfaceVariant: '#3A3A3C', // 更浅的灰色
  text: '#F5F5F5', // 柔白色文字
  textSecondary: '#ABABAB', // 次要文字
  textTertiary: '#6B6B6B', // 更淡的文字
  border: '#38383A', // 边框色
  error: '#F87171', // Red 400
  success: '#4ADE80', // Green 400
  warning: '#FBBF24', // Amber 400
  // Calendar specific
  todayBackground: '#3B2D5F', // Violet 900 去饱和
  todayText: '#C4B5FD', // Violet 300
  selectedBackground: '#4C3A6E', // Violet 800 去饱和
  selectedText: '#DDD6FE', // Violet 200
  eventDefault: '#A78BFA', // Violet 400
  weekendText: '#FCA5A5', // Red 300 - 去饱和
  lunarText: '#6B6B6B', // 更淡的农历文字
  holidayText: '#FCA5A5', // Red 300
  solarTermText: '#6EE7B7', // Emerald 300
};

// ============================================================================
// Shared Theme Values
// ============================================================================

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

const lightShadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
};

const darkShadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.5), 0 4px 6px rgba(0, 0, 0, 0.3)',
};

// ============================================================================
// Theme Creation
// ============================================================================

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  borderRadius,
  shadows: lightShadows,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  borderRadius,
  shadows: darkShadows,
};

export const createTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};

// ============================================================================
// Color Utility Functions
// ============================================================================

export const getEventColor = (color: string, theme: Theme): string => {
  // If color is a valid hex, use it; otherwise use default
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }
  return theme.colors.eventDefault;
};

export const getLunarTextColor = (isHoliday: boolean, isSolarTerm: boolean, theme: Theme): string => {
  if (isHoliday) return theme.colors.holidayText;
  if (isSolarTerm) return theme.colors.solarTermText;
  return theme.colors.lunarText;
};
