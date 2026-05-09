import { default as Dexie, type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import type { Event } from "../domain/types";

// Web implementation using Dexie (IndexedDB)

class YayaDatabase extends Dexie {
  events!: Table<Event, string>;

  constructor() {
    super("YayaCalendarDB");
    this.version(1).stores({
      events: "id, startTime, endTime",
    });
  }
}

let db: YayaDatabase | null = null;

const getDb = (): YayaDatabase => {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
};

const initDatabase = async (): Promise<void> => {
  db = new YayaDatabase();
  await db.open();
};

const createEvent = async (
  eventData: Omit<Event, "id" | "createdAt" | "updatedAt">
): Promise<Event> => {
  const now = new Date().toISOString();
  const event: Event = {
    ...eventData,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  await getDb().events.add(event);
  return event;
};

const updateEvent = async (id: string, updates: Partial<Event>): Promise<Event> => {
  const existing = await getEventById(id);
  if (!existing) throw new Error(`Event not found: ${id}`);

  const now = new Date().toISOString();
  const updated = { ...existing, ...updates, id, updatedAt: now };

  await getDb().events.update(id, updated);
  return updated;
};

const deleteEvent = async (id: string): Promise<void> => {
  await getDb().events.delete(id);
};

const getEventById = async (id: string): Promise<Event | null> => {
  return (await getDb().events.get(id)) ?? null;
};

const getEventsByDateRange = async (start: string, end: string): Promise<Event[]> => {
  return await getDb().events.where("startTime").between(start, end, true, false).toArray();
};

const getAllEvents = async (): Promise<Event[]> => {
  return await getDb().events.toArray();
};

const exportDatabase = async (): Promise<string> => {
  const events = await getAllEvents();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), events });
};

const importDatabase = async (jsonData: string): Promise<void> => {
  const data = JSON.parse(jsonData);
  if (!data.events || !Array.isArray(data.events)) {
    throw new Error("Invalid backup data format");
  }

  await getDb().events.clear();

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
  createEvent,
  deleteEvent,
  exportDatabase,
  getAllEvents,
  getEventById,
  getEventsByDateRange,
  importDatabase,
  initDatabase,
  updateEvent,
};
