// Core domain types for YAYA Calendar App

// ============================================================================
// Event Types
// ============================================================================

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601 with timezone: "2024-03-15T10:00:00+08:00"
  endTime: string;
  color: string; // Hex color code
  recurrenceRule?: RecurrenceRule;
  recurrenceException?: string[]; // ISO dates to exclude from recurrence
  timezone?: string; // IANA timezone identifier (e.g., "Asia/Shanghai")
  createdAt: string;
  updatedAt: string;
}

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number; // Every N days/weeks/months/years
  endDate?: string; // ISO date when recurrence ends
  count?: number; // Number of occurrences
  byDay?: number[]; // For weekly: 0=Sun, 1=Mon, ..., 6=Sat
  byMonthDay?: number; // For monthly: day of month (1-31)
}

// ============================================================================
// View Types
// ============================================================================

export type ViewType = "year" | "month" | "week" | "day" | "events";

export interface ViewState {
  currentView: ViewType;
  selectedDate: string; // ISO date: "2024-03-15"
  focusedEventId?: string;
}

// ============================================================================
// Theme Types
// ============================================================================

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  // Calendar specific
  todayBackground: string;
  todayText: string;
  selectedBackground: string;
  selectedText: string;
  eventDefault: string;
  weekendText: string;
  lunarText: string;
  holidayText: string;
  solarTermText: string;
}

export interface Theme {
  mode: "light" | "dark";
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// ============================================================================
// Lunar Calendar Types
// ============================================================================

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  monthName: string; // "正月", "二月", etc.
  dayName: string; // "初一", "初二", etc.
  yearGanZhi: string; // "甲子年"
  monthGanZhi: string; // "甲子月"
  dayGanZhi: string; // "甲子日"
  yearShengXiao: string; // "鼠年"
}

export interface SolarTerm {
  name: string; // "立春", "雨水", etc.
  date: string; // ISO date
  index: number; // 0-23
}

export interface Holiday {
  name: string;
  date: string; // ISO date
  type: "traditional" | "statutory" | "solar_term";
  isHoliday: boolean; // Is a day off
  isWorkday?: boolean; // Compensated workday
}

// ============================================================================
// Database Types
// ============================================================================

export interface DatabaseAdapter {
  init(): Promise<void>;
  createEvent(event: Omit<Event, "id" | "createdAt" | "updatedAt">): Promise<Event>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  getEventById(id: string): Promise<Event | null>;
  getEventsByDateRange(start: string, end: string): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
}

// ============================================================================
// Animation Types
// ============================================================================

export interface AnimationConfig {
  duration: number;
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut";
  useNativeDriver: boolean;
}

export const ANIMATION_PRESETS = {
  fast: { duration: 150, easing: "easeOut" as const, useNativeDriver: true },
  normal: { duration: 250, easing: "easeOut" as const, useNativeDriver: true },
  slow: { duration: 350, easing: "easeInOut" as const, useNativeDriver: true },
  spring: { duration: 400, easing: "easeOut" as const, useNativeDriver: true },
} as const;
