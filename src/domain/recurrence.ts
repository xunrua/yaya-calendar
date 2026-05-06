import { RRule, Frequency, ByWeekday } from 'rrule';
import { RecurrenceRule, Event } from '../domain/types';

// ============================================================================
// Recurrence Service
// ============================================================================

/**
 * Convert our RecurrenceRule to RRule options
 */
const toRRuleOptions = (rule: RecurrenceRule, startDate: Date): Partial<RRule.Options> => {
  const freqMap: Record<string, Frequency> = {
    daily: RRule.DAILY,
    weekly: RRule.WEEKLY,
    monthly: RRule.MONTHLY,
    yearly: RRule.YEARLY,
  };

  const options: Partial<RRule.Options> = {
    dtstart: startDate,
    freq: freqMap[rule.frequency],
    interval: rule.interval,
  };

  if (rule.endDate) {
    options.until = new Date(rule.endDate);
  }

  if (rule.count) {
    options.count = rule.count;
  }

  if (rule.byDay) {
    // Convert day numbers (0=Sun, 6=Sat) to RRule weekdays
    const weekdayMap: Record<number, ByWeekday> = {
      0: RRule.SU,
      1: RRule.MO,
      2: RRule.TU,
      3: RRule.WE,
      4: RRule.TH,
      5: RRule.FR,
      6: RRule.SA,
    };
    options.byweekday = rule.byDay.map(d => weekdayMap[d]);
  }

  if (rule.byMonthDay) {
    options.bymonthday = rule.byMonthDay;
  }

  return options;
};

/**
 * Expand a recurring event into individual occurrences within a date range
 */
export const expandRecurrence = (
  event: Event,
  rangeStart: Date,
  rangeEnd: Date
): Date[] => {
  if (!event.recurrenceRule) {
    // Non-recurring event: check if it falls within range
    const eventStart = new Date(event.startTime);
    if (eventStart >= rangeStart && eventStart < rangeEnd) {
      return [eventStart];
    }
    return [];
  }

  const startDate = new Date(event.startTime);
  const options = toRRuleOptions(event.recurrenceRule, startDate);

  try {
    const rrule = new RRule(options);
    const dates = rrule.between(rangeStart, rangeEnd, true);

    // Filter out exception dates
    const exceptions = new Set(
      (event.recurrenceException ?? []).map(d => d.split('T')[0])
    );

    return dates.filter(date => {
      const dateStr = date.toISOString().split('T')[0];
      return !exceptions.has(dateStr);
    });
  } catch (error) {
    console.error('Failed to expand recurrence:', error);
    return [];
  }
};

/**
 * Get the next occurrence of a recurring event after a given date
 */
export const getNextOccurrence = (
  event: Event,
  after: Date
): Date | null => {
  if (!event.recurrenceRule) return null;

  const startDate = new Date(event.startTime);
  const options = toRRuleOptions(event.recurrenceRule, startDate);

  try {
    const rrule = new RRule(options);
    const dates = rrule.after(after, false);

    // Check if it's an exception
    if (dates) {
      const exceptions = new Set(
        (event.recurrenceException ?? []).map(d => d.split('T')[0])
      );
      const dateStr = dates.toISOString().split('T')[0];
      if (exceptions.has(dateStr)) {
        return getNextOccurrence(event, dates);
      }
    }

    return dates;
  } catch (error) {
    console.error('Failed to get next occurrence:', error);
    return null;
  }
};

/**
 * Check if a specific date is an exception for a recurring event
 */
export const isRecurrenceException = (event: Event, date: Date): boolean => {
  if (!event.recurrenceException) return false;

  const dateStr = date.toISOString().split('T')[0];
  return event.recurrenceException.includes(dateStr);
};

/**
 * Add an exception date to a recurring event
 */
export const addRecurrenceException = (
  event: Event,
  exceptionDate: Date
): string[] => {
  const dateStr = exceptionDate.toISOString().split('T')[0];
  const exceptions = event.recurrenceException ?? [];

  if (exceptions.includes(dateStr)) {
    return exceptions;
  }

  return [...exceptions, dateStr];
};

/**
 * Remove an exception date from a recurring event
 */
export const removeRecurrenceException = (
  event: Event,
  exceptionDate: Date
): string[] => {
  const dateStr = exceptionDate.toISOString().split('T')[0];
  return (event.recurrenceException ?? []).filter(d => d !== dateStr);
};

/**
 * Create a human-readable description of the recurrence rule
 */
export const describeRecurrence = (rule: RecurrenceRule): string => {
  const freqNames: Record<string, string> = {
    daily: '天',
    weekly: '周',
    monthly: '月',
    yearly: '年',
  };

  let description = `每${rule.interval > 1 ? rule.interval : ''}${freqNames[rule.frequency]}`;

  if (rule.byDay && rule.frequency === 'weekly') {
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const days = rule.byDay.map(d => dayNames[d]).join('、');
    description += `的${days}`;
  }

  if (rule.endDate) {
    const endDate = new Date(rule.endDate);
    description += `，直到${endDate.toLocaleDateString('zh-CN')}`;
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
      const dateStr = date.toISOString().split('T')[0];
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
): Omit<Event, 'id' | 'createdAt' | 'updatedAt'> => {
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