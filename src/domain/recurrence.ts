import type { Event, RecurrenceRule } from "../domain/types";

// ============================================================================
// Recurrence Service
// ============================================================================

/**
 * Expand a recurring event into individual occurrences within a date range
 */
export const expandRecurrence = (event: Event, rangeStart: Date, rangeEnd: Date): Date[] => {
  if (!event.recurrenceRule) {
    // Non-recurring event: check if it falls within range
    const eventStart = new Date(event.startTime);
    if (eventStart >= rangeStart && eventStart < rangeEnd) {
      return [eventStart];
    }
    return [];
  }

  const startDate = new Date(event.startTime);
  const rule = event.recurrenceRule;
  const dates: Date[] = [];

  // Simple recurrence expansion without rrule library for now
  const exceptions = new Set((event.recurrenceException ?? []).map((d) => d.split("T")[0]));

  const currentDate = new Date(startDate);
  let count = 0;
  const maxIterations = 1000; // Safety limit

  while (currentDate < rangeEnd && count < maxIterations) {
    if (currentDate >= rangeStart) {
      const dateStr = currentDate.toISOString().split("T")[0];
      if (!exceptions.has(dateStr)) {
        dates.push(new Date(currentDate));
      }
    }

    // Move to next occurrence
    switch (rule.frequency) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + rule.interval);
        break;
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 7 * rule.interval);
        break;
      case "monthly":
        currentDate.setMonth(currentDate.getMonth() + rule.interval);
        break;
      case "yearly":
        currentDate.setFullYear(currentDate.getFullYear() + rule.interval);
        break;
    }

    // Check end conditions
    if (rule.endDate && currentDate > new Date(rule.endDate)) break;
    if (rule.count && dates.length >= rule.count) break;

    count++;
  }

  return dates;
};

/**
 * Get the next occurrence of a recurring event after a given date
 */
export const getNextOccurrence = (event: Event, after: Date): Date | null => {
  if (!event.recurrenceRule) return null;

  const occurrences = expandRecurrence(
    event,
    after,
    new Date(after.getTime() + 365 * 24 * 60 * 60 * 1000)
  );
  return occurrences.length > 0 ? occurrences[0] : null;
};

/**
 * Check if a specific date is an exception for a recurring event
 */
export const isRecurrenceException = (event: Event, date: Date): boolean => {
  if (!event.recurrenceException) return false;

  const dateStr = date.toISOString().split("T")[0];
  return event.recurrenceException.includes(dateStr);
};

/**
 * Add an exception date to a recurring event
 */
export const addRecurrenceException = (event: Event, exceptionDate: Date): string[] => {
  const dateStr = exceptionDate.toISOString().split("T")[0];
  const exceptions = event.recurrenceException ?? [];

  if (exceptions.includes(dateStr)) {
    return exceptions;
  }

  return [...exceptions, dateStr];
};

/**
 * Remove an exception date from a recurring event
 */
export const removeRecurrenceException = (event: Event, exceptionDate: Date): string[] => {
  const dateStr = exceptionDate.toISOString().split("T")[0];
  return (event.recurrenceException ?? []).filter((d) => d !== dateStr);
};

/**
 * Create a human-readable description of the recurrence rule
 */
export const describeRecurrence = (rule: RecurrenceRule): string => {
  const freqNames: Record<string, string> = {
    daily: "天",
    weekly: "周",
    monthly: "月",
    yearly: "年",
  };

  let description = `每${rule.interval > 1 ? rule.interval : ""}${freqNames[rule.frequency]}`;

  if (rule.byDay && rule.frequency === "weekly") {
    const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const days = rule.byDay.map((d) => dayNames[d]).join("、");
    description += `的${days}`;
  }

  if (rule.endDate) {
    const endDate = new Date(rule.endDate);
    description += `，直到${endDate.toLocaleDateString("zh-CN")}`;
  } else if (rule.count) {
    description += `，共${rule.count}次`;
  }

  return description;
};

/**
 * Get all occurrences of events within a date range, handling both
 * recurring and non-recurring events
 */
export const getEventOccurrencesInRange = (
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, Event[]> => {
  const occurrences = new Map<string, Event[]>();

  for (const event of events) {
    const dates = expandRecurrence(event, rangeStart, rangeEnd);

    for (const date of dates) {
      const dateStr = date.toISOString().split("T")[0];
      const existing = occurrences.get(dateStr) ?? [];
      existing.push(event);
      occurrences.set(dateStr, existing);
    }
  }

  return occurrences;
};

/**
 * Create a new event from a single occurrence of a recurring event
 * (for editing a single instance)
 */
export const createSingleOccurrenceEvent = (
  originalEvent: Event,
  occurrenceDate: Date,
  modifications: Partial<Event>
): Omit<Event, "id" | "createdAt" | "updatedAt"> => {
  // Calculate the time offset from the original event
  const originalStart = new Date(originalEvent.startTime);
  const originalEnd = new Date(originalEvent.endTime);
  const duration = originalEnd.getTime() - originalStart.getTime();

  // Apply the same offset to the occurrence date
  const newStart = new Date(occurrenceDate);
  newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
  const newEnd = new Date(newStart.getTime() + duration);

  return {
    title: modifications.title ?? originalEvent.title,
    description: modifications.description ?? originalEvent.description,
    startTime: newStart.toISOString(),
    endTime: newEnd.toISOString(),
    color: modifications.color ?? originalEvent.color,
    timezone: originalEvent.timezone,
    // The new event is not recurring
    recurrenceRule: undefined,
    recurrenceException: undefined,
  };
};

export default {
  expandRecurrence,
  getNextOccurrence,
  isRecurrenceException,
  addRecurrenceException,
  removeRecurrenceException,
  describeRecurrence,
  getEventOccurrencesInRange,
  createSingleOccurrenceEvent,
};
