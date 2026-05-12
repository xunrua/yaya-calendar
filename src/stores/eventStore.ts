// 事件状态管理 Store

import { create } from "zustand";
import { expandRecurrence, getEventOccurrencesInRange } from "../domain/recurrence";
import type { Event, ViewType } from "../domain/types";
import * as database from "../services/database";

// ============================================================================
// 月级事件缓存（避免每次 getEventsForMonth 都新建 Map 引用，导致 MonthGrid memo 失效）
// ============================================================================

const eventsMonthCache = new Map<string, Map<string, Event[]>>();
const invalidateEventsMonthCache = () => {
  eventsMonthCache.clear();
};

// ============================================================================
// 事件 Store 状态
// ============================================================================

interface EventState {
  events: Event[]; // 所有事件列表
  loading: boolean; // 是否正在加载
  error: string | null; // 错误信息
  selectedEventId: string | null; // 当前选中的事件 ID

  // 操作方法
  loadEvents: () => Promise<void>;
  createEvent: (event: Omit<Event, "id" | "createdAt" | "updatedAt">) => Promise<Event>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  selectEvent: (id: string | null) => void;
  getEventById: (id: string) => Event | undefined;
  getEventsForDate: (date: string) => Event[];
  getEventsForMonth: (year: number, month: number) => Map<string, Event[]>;
  getEventsForDateRange: (startDate: Date, endDate: Date) => Map<string, Event[]>;
}

// ============================================================================
// 事件 Store
// ============================================================================

/** 事件状态管理 Store */
export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  loading: false,
  error: null,
  selectedEventId: null,

  loadEvents: async () => {
    set({ loading: true, error: null });
    try {
      await database.initDatabase();
      const events = await database.getAllEvents();
      invalidateEventsMonthCache();
      set({ events, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createEvent: async (eventData) => {
    set({ loading: true, error: null });
    try {
      const event = await database.createEvent(eventData);
      invalidateEventsMonthCache();
      set((state) => ({
        events: [...state.events, event],
        loading: false,
      }));
      return event;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateEvent: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const event = await database.updateEvent(id, updates);
      invalidateEventsMonthCache();
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? event : e)),
        loading: false,
      }));
      return event;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteEvent: async (id) => {
    set({ loading: true, error: null });
    try {
      await database.deleteEvent(id);
      invalidateEventsMonthCache();
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        loading: false,
        selectedEventId: state.selectedEventId === id ? null : state.selectedEventId,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  selectEvent: (id) => {
    set({ selectedEventId: id });
  },

  getEventById: (id) => {
    return get().events.find((e) => e.id === id);
  },

  getEventsForDate: (date) => {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);

    const eventsForDate: Event[] = [];

    for (const event of get().events) {
      const occurrences = expandRecurrence(event, dateStart, dateEnd);
      if (occurrences.length > 0) {
        eventsForDate.push(event);
      }
    }

    return eventsForDate.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  getEventsForMonth: (year, month) => {
    const cacheKey = `${year}-${month}`;
    const cached = eventsMonthCache.get(cacheKey);
    if (cached) return cached;

    const monthStart = new Date(year, month, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const result = getEventOccurrencesInRange(get().events, monthStart, monthEnd);
    eventsMonthCache.set(cacheKey, result);
    return result;
  },

  getEventsForDateRange: (startDate, endDate) => {
    return getEventOccurrencesInRange(get().events, startDate, endDate);
  },
}));

// ============================================================================
// 视图 Store（日历导航）
// ============================================================================

/** 视图过渡动画状态 */
interface ViewTransitionState {
  sourceLayout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  targetLayout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/** 视图状态 */
interface ViewState {
  currentView: ViewType; // 当前视图类型
  selectedDate: string; // 选中日期（ISO 格式）
  /** 用户是否在月视图中主动滑动过月份 */
  hasNavigatedMonth: boolean;
  transitionState: ViewTransitionState;
  yearCellLayouts: Record<number, { x: number; y: number; width: number; height: number }>;
  displayMonth: string; // 显示月份（ISO 格式，月初日期）
  setCurrentView: (view: ViewType) => void;
  setSelectedDate: (date: string) => void;
  /** 同时更新 selectedDate 和 displayMonth（月初对齐），避免触发组件层的二次渲染 effect */
  setSelectedDateAndMonth: (date: string) => void;
  setHasNavigatedMonth: (value: boolean) => void;
  setTransitionState: (state: ViewTransitionState) => void;
  setYearCellLayouts: (
    layouts: Record<number, { x: number; y: number; width: number; height: number }>
  ) => void;
  setDisplayMonth: (date: string) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
}

/** 获取今天的 ISO 日期字符串 */
const getTodayString = (): string => {
  const today = new Date();
  // 使用本地时间格式化，避免 toISOString() 的 UTC 转换问题
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** 获取本月月初的 ISO 日期字符串 */
const getMonthStartString = (): string => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  // 使用本地时间格式化，避免 toISOString() 的 UTC 转换问题
  const year = monthStart.getFullYear();
  const month = String(monthStart.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

export const useViewStore = create<ViewState>((set, get) => ({
  currentView: "month",
  selectedDate: getTodayString(),
  hasNavigatedMonth: false,
  transitionState: {},
  yearCellLayouts: {},
  displayMonth: getMonthStartString(),

  setCurrentView: (view) => {
    set({ currentView: view });
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  setSelectedDateAndMonth: (date) => {
    const [y, m] = date.split("-");
    const monthStart = `${y}-${m}-01`;
    set({ selectedDate: date, displayMonth: monthStart });
  },

  setHasNavigatedMonth: (value) => {
    set({ hasNavigatedMonth: value });
  },

  setTransitionState: (state) => {
    set({ transitionState: state });
  },

  setYearCellLayouts: (layouts) => {
    set({ yearCellLayouts: layouts });
  },

  setDisplayMonth: (date) => {
    set({ displayMonth: date });
  },

  goToToday: () => {
    const today = getTodayString();
    const monthStart = getMonthStartString();
    set({
      selectedDate: today,
      displayMonth: monthStart, // 使用月初日期，而不是今天
      hasNavigatedMonth: false,
    });
  },

  goToPrevious: () => {
    const { currentView, selectedDate } = get();
    const date = new Date(selectedDate);

    switch (currentView) {
      case "year":
        date.setFullYear(date.getFullYear() - 1);
        break;
      case "day":
        date.setDate(date.getDate() - 1);
        break;
      case "week":
        date.setDate(date.getDate() - 7);
        break;
      case "month":
        date.setMonth(date.getMonth() - 1);
        break;
      case "events":
        date.setMonth(date.getMonth() - 1);
        break;
    }

    set({ selectedDate: date.toISOString().split("T")[0] });
  },

  goToNext: () => {
    const { currentView, selectedDate } = get();
    const date = new Date(selectedDate);

    switch (currentView) {
      case "year":
        date.setFullYear(date.getFullYear() + 1);
        break;
      case "day":
        date.setDate(date.getDate() + 1);
        break;
      case "week":
        date.setDate(date.getDate() + 7);
        break;
      case "month":
        date.setMonth(date.getMonth() + 1);
        break;
      case "events":
        date.setMonth(date.getMonth() + 1);
        break;
    }

    set({ selectedDate: date.toISOString().split("T")[0] });
  },
}));

// ============================================================================
// Hooks
// ============================================================================

/**
 * 获取事件数据的 Hook
 * @param startDate 可选，开始日期
 * @param endDate 可选，结束日期
 * @returns 事件数据、加载状态、刷新方法
 */
export const useEvents = (startDate?: Date, endDate?: Date) => {
  const { events, loading, error, loadEvents } = useEventStore();

  // Load events on mount
  if (events.length === 0 && !loading) {
    loadEvents();
  }

  const getEventsForRange = () => {
    if (!startDate || !endDate) return events;
    return getEventOccurrencesInRange(events, startDate, endDate);
  };

  return {
    events,
    loading,
    error,
    refresh: loadEvents,
    getEventsForRange,
  };
};

/**
 * 获取当前选中事件的 Hook
 * @returns 选中的事件、事件 ID、选择方法
 */
export const useSelectedEvent = () => {
  const { selectedEventId, selectEvent, getEventById } = useEventStore();
  const selectedEvent = selectedEventId ? getEventById(selectedEventId) : null;

  return {
    selectedEvent,
    selectedEventId,
    selectEvent,
  };
};

export default useEventStore;
