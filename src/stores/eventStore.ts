import { create } from "zustand";
import { expandRecurrence, getEventOccurrencesInRange } from "../domain/recurrence";
import type { Event, ViewType } from "../domain/types";
import * as database from "../services/database";

// ============================================================================
// Event Store State
// ============================================================================

interface EventState {
  events: Event[];
  loading: boolean;
  error: string | null;
  selectedEventId: string | null;

  // Actions
  loadEvents: () => Promise<void>;
  createEvent: (event: Omit<Event, "id" | "createdAt" | "updatedAt">) => Promise<Event>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  selectEvent: (id: string | null) => void;
  getEventById: (id: string) => Event | undefined;
  getEventsForDate: (date: string) => Event[];
  getEventsForDateRange: (startDate: Date, endDate: Date) => Map<string, Event[]>;
}

// ============================================================================
// Event Store
// ============================================================================

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
      set({ events, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createEvent: async (eventData) => {
    set({ loading: true, error: null });
    try {
      const event = await database.createEvent(eventData);
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

  getEventsForDateRange: (startDate, endDate) => {
    return getEventOccurrencesInRange(get().events, startDate, endDate);
  },
}));

// ============================================================================
// View Store (for calendar navigation)
// ============================================================================

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

interface ViewState {
  currentView: ViewType;
  selectedDate: string; // ISO date string
  /** 用户是否在月视图中主动滑动过月份 */
  hasNavigatedMonth: boolean;
  transitionState: ViewTransitionState;
  yearCellLayouts: Record<number, { x: number; y: number; width: number; height: number }>;
  displayMonth: string; // ISO date string (月初日期)
  setCurrentView: (view: ViewType) => void;
  setSelectedDate: (date: string) => void;
  setHasNavigatedMonth: (value: boolean) => void;
  setTransitionState: (state: ViewTransitionState) => void;
  setYearCellLayouts: (layouts: Record<number, { x: number; y: number; width: number; height: number }>) => void;
  setDisplayMonth: (date: string) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
}

const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

export const useViewStore = create<ViewState>((set, get) => ({
  currentView: "month",
  selectedDate: getTodayString(),
  hasNavigatedMonth: false,
  transitionState: {},
  yearCellLayouts: {},
  displayMonth: getTodayString(),

  setCurrentView: (view) => {
    set({ currentView: view });
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
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
    set({
      selectedDate: today,
      displayMonth: today,
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
