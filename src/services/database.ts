import { Event } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

// Web implementation using Dexie (IndexedDB)

let db: any = null;

const initDatabase = async (): Promise<void> => {
  const Dexie = require('dexie');
  db = new Dexie('YayaCalendarDB');

  db.version(1).stores({
    events: 'id, startTime, endTime',
  });

  await db.open();
};

const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> => {
  const now = new Date().toISOString();
  const event: Event = {
    ...eventData,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  await db.events.add(event);
  return event;
};

const updateEvent = async (id: string, updates: Partial<Event>): Promise<Event> => {
  const existing = await getEventById(id);
  if (!existing) throw new Error(`Event not found: ${id}`);

  const now = new Date().toISOString();
  const updated = { ...existing, ...updates, id, updatedAt: now };

  await db.events.update(id, updated);
  return updated;
};

const deleteEvent = async (id: string): Promise<void> => {
  await db.events.delete(id);
};

const getEventById = async (id: string): Promise<Event | null> => {
  return await db.events.get(id) ?? null;
};

const getEventsByDateRange = async (start: string, end: string): Promise<Event[]> => {
  return await db.events
    .where('startTime')
    .between(start, end, true, false)
    .toArray();
};

const getAllEvents = async (): Promise<Event[]> => {
  return await db.events.toArray();
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

  await db.events.clear();

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