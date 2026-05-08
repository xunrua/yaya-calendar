import { Event } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

// Native implementation using expo-sqlite
// This file is used only for iOS/Android platforms

let db: any = null;

const initDatabase = async (): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLite = require('expo-sqlite');
  db = await SQLite.openDatabaseAsync('yaya_calendar.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      migrated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366F1',
      recurrence_rule TEXT,
      recurrence_exception TEXT,
      timezone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
    CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
  `);
};

const mapRowToEvent = (row: any): Event => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  startTime: row.start_time,
  endTime: row.end_time,
  color: row.color,
  recurrenceRule: row.recurrence_rule ? JSON.parse(row.recurrence_rule) : undefined,
  recurrenceException: row.recurrence_exception ? JSON.parse(row.recurrence_exception) : undefined,
  timezone: row.timezone ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> => {
  const now = new Date().toISOString();
  const event: Event = {
    ...eventData,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO events (id, title, description, start_time, end_time, color, recurrence_rule, recurrence_exception, timezone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id, event.title, event.description ?? null, event.startTime, event.endTime,
      event.color, event.recurrenceRule ? JSON.stringify(event.recurrenceRule) : null,
      event.recurrenceException ? JSON.stringify(event.recurrenceException) : null,
      event.timezone ?? null, event.createdAt, event.updatedAt,
    ]
  );

  return event;
};

const updateEvent = async (id: string, updates: Partial<Event>): Promise<Event> => {
  const existing = await getEventById(id);
  if (!existing) throw new Error(`Event not found: ${id}`);

  const now = new Date().toISOString();
  const updated = { ...existing, ...updates, id, updatedAt: now };

  await db.runAsync(
    `UPDATE events SET title = ?, description = ?, start_time = ?, end_time = ?, color = ?, recurrence_rule = ?, recurrence_exception = ?, timezone = ?, updated_at = ? WHERE id = ?`,
    [
      updated.title, updated.description ?? null, updated.startTime, updated.endTime, updated.color,
      updated.recurrenceRule ? JSON.stringify(updated.recurrenceRule) : null,
      updated.recurrenceException ? JSON.stringify(updated.recurrenceException) : null,
      updated.timezone ?? null, updated.updatedAt, id,
    ]
  );

  return updated;
};

const deleteEvent = async (id: string): Promise<void> => {
  await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
};

const getEventById = async (id: string): Promise<Event | null> => {
  const row = await db.getFirstAsync('SELECT * FROM events WHERE id = ?', [id]);
  return row ? mapRowToEvent(row) : null;
};

const getEventsByDateRange = async (start: string, end: string): Promise<Event[]> => {
  const rows = await db.getAllAsync(
    'SELECT * FROM events WHERE start_time >= ? AND start_time < ? ORDER BY start_time ASC',
    [start, end]
  );
  return rows.map(mapRowToEvent);
};

const getAllEvents = async (): Promise<Event[]> => {
  const rows = await db.getAllAsync('SELECT * FROM events ORDER BY start_time ASC');
  return rows.map(mapRowToEvent);
};

const exportDatabase = async (): Promise<string> => {
  const events = await getAllEvents();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), events });
};

const importDatabase = async (jsonData: string): Promise<void> => {
  const data = JSON.parse(jsonData);
  if (!data.events || !Array.isArray(data.events)) {
    throw new Error('Invalid backup data format');
  }

  await db.runAsync('DELETE FROM events');

  for (const event of data.events as Event[]) {
    await createEvent({
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color,
      recurrenceRule: event.recurrenceRule,
      recurrenceException: event.recurrenceException,
      timezone: event.timezone,
    });
  }
};

export default {
  initDatabase,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  getEventsByDateRange,
  getAllEvents,
  exportDatabase,
  importDatabase,
};

// Named exports for direct import
export {
  initDatabase,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  getEventsByDateRange,
  getAllEvents,
  exportDatabase,
  importDatabase,
};