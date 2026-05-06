import * as SQLite from 'expo-sqlite';
import { Event, RecurrenceRule } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Database Configuration
// ============================================================================

const DATABASE_NAME = 'yaya_calendar.db';
const SCHEMA_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

// ============================================================================
// Database Initialization
// ============================================================================

export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Create schema_version table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        migrated_at TEXT NOT NULL
      );
    `);

    // Check current version
    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_version WHERE id = 1'
    );

    const currentVersion = result?.version ?? 0;

    if (currentVersion < SCHEMA_VERSION) {
      await runMigrations(currentVersion);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// ============================================================================
// Migrations
// ============================================================================

const runMigrations = async (fromVersion: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  // Migration 1: Initial schema
  if (fromVersion < 1) {
    await db.execAsync(`
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

    await db.runAsync(
      'INSERT INTO schema_version (id, version, migrated_at) VALUES (1, ?, ?)',
      [SCHEMA_VERSION, new Date().toISOString()]
    );
  }
};

// ============================================================================
// Event CRUD Operations
// ============================================================================

export const createEvent = async (
  eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Event> => {
  if (!db) throw new Error('Database not initialized');

  const now = new Date().toISOString();
  const event: Event = {
    ...eventData,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO events (
      id, title, description, start_time, end_time, color,
      recurrence_rule, recurrence_exception, timezone, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.title,
      event.description ?? null,
      event.startTime,
      event.endTime,
      event.color,
      event.recurrenceRule ? JSON.stringify(event.recurrenceRule) : null,
      event.recurrenceException ? JSON.stringify(event.recurrenceException) : null,
      event.timezone ?? null,
      event.createdAt,
      event.updatedAt,
    ]
  );

  return event;
};

export const updateEvent = async (
  id: string,
  updates: Partial<Event>
): Promise<Event> => {
  if (!db) throw new Error('Database not initialized');

  const existingEvent = await getEventById(id);
  if (!existingEvent) throw new Error(`Event not found: ${id}`);

  const now = new Date().toISOString();
  const updatedEvent: Event = {
    ...existingEvent,
    ...updates,
    id, // Ensure ID cannot be changed
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE events SET
      title = ?, description = ?, start_time = ?, end_time = ?,
      color = ?, recurrence_rule = ?, recurrence_exception = ?,
      timezone = ?, updated_at = ?
    WHERE id = ?`,
    [
      updatedEvent.title,
      updatedEvent.description ?? null,
      updatedEvent.startTime,
      updatedEvent.endTime,
      updatedEvent.color,
      updatedEvent.recurrenceRule ? JSON.stringify(updatedEvent.recurrenceRule) : null,
      updatedEvent.recurrenceException ? JSON.stringify(updatedEvent.recurrenceException) : null,
      updatedEvent.timezone ?? null,
      updatedEvent.updatedAt,
      id,
    ]
  );

  return updatedEvent;
};

export const deleteEvent = async (id: string): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
};

export const getEventById = async (id: string): Promise<Event | null> => {
  if (!db) throw new Error('Database not initialized');

  const row = await db.getFirstAsync<{
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    color: string;
    recurrence_rule: string | null;
    recurrence_exception: string | null;
    timezone: string | null;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM events WHERE id = ?', [id]);

  if (!row) return null;

  return mapRowToEvent(row);
};

export const getEventsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<Event[]> => {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    color: string;
    recurrence_rule: string | null;
    recurrence_exception: string | null;
    timezone: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM events
     WHERE start_time >= ? AND start_time < ?
     ORDER BY start_time ASC`,
    [startDate, endDate]
  );

  return rows.map(mapRowToEvent);
};

export const getAllEvents = async (): Promise<Event[]> => {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    color: string;
    recurrence_rule: string | null;
    recurrence_exception: string | null;
    timezone: string | null;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM events ORDER BY start_time ASC');

  return rows.map(mapRowToEvent);
};

// ============================================================================
// Helper Functions
// ============================================================================

const mapRowToEvent = (row: {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  color: string;
  recurrence_rule: string | null;
  recurrence_exception: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}): Event => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  startTime: row.start_time,
  endTime: row.end_time,
  color: row.color,
  recurrenceRule: row.recurrence_rule
    ? (JSON.parse(row.recurrence_rule) as RecurrenceRule)
    : undefined,
  recurrenceException: row.recurrence_exception
    ? (JSON.parse(row.recurrence_exception) as string[])
    : undefined,
  timezone: row.timezone ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ============================================================================
// Database Export (for backup)
// ============================================================================

export const exportDatabase = async (): Promise<string> => {
  const events = await getAllEvents();
  return JSON.stringify({
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    events,
  });
};

export const importDatabase = async (jsonData: string): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  const data = JSON.parse(jsonData);
  if (!data.events || !Array.isArray(data.events)) {
    throw new Error('Invalid backup data format');
  }

  // Clear existing events
  await db.runAsync('DELETE FROM events');

  // Import events
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