// Web 平台数据库实现（使用 Dexie / IndexedDB）

import { default as Dexie, type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import type { Event } from "../domain/types";

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

/**
 * 获取数据库实例
 * @throws 如果数据库未初始化
 */
const getDb = (): YayaDatabase => {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
};

/**
 * 初始化数据库连接
 * 必须在其他数据库操作之前调用
 */
const initDatabase = async (): Promise<void> => {
  db = new YayaDatabase();
  await db.open();
};

/**
 * 创建事件
 * 自动生成 id、createdAt、updatedAt
 * @param eventData 事件数据（不含 id 和时间戳）
 * @returns 创建的事件对象
 */
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

/**
 * 更新事件
 * @param id 事件 ID
 * @param updates 要更新的字段
 * @returns 更新后的事件对象
 * @throws 如果事件不存在
 */
const updateEvent = async (id: string, updates: Partial<Event>): Promise<Event> => {
  const existing = await getEventById(id);
  if (!existing) throw new Error(`Event not found: ${id}`);

  const now = new Date().toISOString();
  const updated = { ...existing, ...updates, id, updatedAt: now };

  await getDb().events.update(id, updated);
  return updated;
};

/**
 * 删除事件
 * @param id 事件 ID
 */
const deleteEvent = async (id: string): Promise<void> => {
  await getDb().events.delete(id);
};

/**
 * 根据 ID 获取事件
 * @param id 事件 ID
 * @returns 事件对象，不存在则返回 null
 */
const getEventById = async (id: string): Promise<Event | null> => {
  return (await getDb().events.get(id)) ?? null;
};

/**
 * 获取指定日期范围内的事件
 * @param start 开始时间（ISO 格式，包含）
 * @param end 结束时间（ISO 格式，不包含）
 * @returns 事件数组，按开始时间排序
 */
const getEventsByDateRange = async (start: string, end: string): Promise<Event[]> => {
  return await getDb().events.where("startTime").between(start, end, true, false).toArray();
};

/**
 * 获取所有事件
 * @returns 所有事件数组
 */
const getAllEvents = async (): Promise<Event[]> => {
  return await getDb().events.toArray();
};

/**
 * 导出数据库为 JSON 字符串
 * @returns JSON 格式的备份数据
 */
const exportDatabase = async (): Promise<string> => {
  const events = await getAllEvents();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), events });
};

/**
 * 从 JSON 字符串导入数据
 * 会清空现有数据后导入
 * @param jsonData JSON 格式的备份数据
 * @throws 如果数据格式无效
 */
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
