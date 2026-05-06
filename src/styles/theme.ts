import { Theme, ThemeColors } from '../domain/types';

// ============================================================================
// Light Theme Colors
// ============================================================================

const lightColors: ThemeColors = {
  primary: '#6366F1', // Indigo 500
  primaryLight: '#818CF8', // Indigo 400
  primaryDark: '#4F46E5', // Indigo 600
  background: '#FFFFFF',
  surface: '#F8FAFC', // Slate 50
  surfaceVariant: '#F1F5F9', // Slate 100
  text: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textTertiary: '#94A3B8', // Slate 400
  border: '#E2E8F0', // Slate 200
  error: '#EF4444', // Red 500
  success: '#22C55E', // Green 500
  warning: '#F59E0B', // Amber 500
  // Calendar specific
  todayBackground: '#EEF2FF', // Indigo 50
  todayText: '#4F46E5', // Indigo 600
  eventDefault: '#6366F1', // Indigo 500
  weekendText: '#DC2626', // Red 600
  lunarText: '#64748B', // Slate 500
  holidayText: '#DC2626', // Red 600
  solarTermText: '#16A34A', // Green 600
};

// ============================================================================
// Dark Theme Colors
// ============================================================================

const darkColors: ThemeColors = {
  primary: '#818CF8', // Indigo 400
  primaryLight: '#A5B4FC', // Indigo 300
  primaryDark: '#6366F1', // Indigo 500
  background: '#0F172A', // Slate 900
  surface: '#1E293B', // Slate 800
  surfaceVariant: '#334155', // Slate 700
  text: '#F8FAFC', // Slate 50
  textSecondary: '#CBD5E1', // Slate 300
  textTertiary: '#64748B', // Slate 500
  border: '#334155', // Slate 700
  error: '#F87171', // Red 400
  success: '#4ADE80', // Green 400
  warning: '#FBBF24', // Amber 400
  // Calendar specific
  todayBackground: '#312E81', // Indigo 900
  todayText: '#A5B4FC', // Indigo 300
  eventDefault: '#818CF8', // Indigo 400
  weekendText: '#F87171', // Red 400
  lunarText: '#94A3B8', // Slate 400
  holidayText: '#F87171', // Red 400
  solarTermText: '#4ADE80', // Green 400
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
