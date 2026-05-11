// Native 平台数据库实现（使用 expo-sqlite）
// 此文件仅用于 iOS/Android 平台

import { v4 as uuidv4 } from "uuid";
import type { Event } from "../domain/types";

let db: any = null;

/**
 * 初始化数据库连接
 * 创建 events 表和索引
 */
const initDatabase = async (): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLite = require("expo-sqlite");
  db = await SQLite.openDatabaseAsync("yaya_calendar.db");

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

/**
 * 将数据库行转换为 Event 对象
 * @param row SQLite 查询结果行
 * @returns Event 对象
 */
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

  await db.runAsync(
    `INSERT INTO events (id, title, description, start_time, end_time, color, recurrence_rule, recurrence_exception, timezone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  await db.runAsync(
    `UPDATE events SET title = ?, description = ?, start_time = ?, end_time = ?, color = ?, recurrence_rule = ?, recurrence_exception = ?, timezone = ?, updated_at = ? WHERE id = ?`,
    [
      updated.title,
      updated.description ?? null,
      updated.startTime,
      updated.endTime,
      updated.color,
      updated.recurrenceRule ? JSON.stringify(updated.recurrenceRule) : null,
      updated.recurrenceException ? JSON.stringify(updated.recurrenceException) : null,
      updated.timezone ?? null,
      updated.updatedAt,
      id,
    ]
  );

  return updated;
};

/**
 * 删除事件
 * @param id 事件 ID
 */
const deleteEvent = async (id: string): Promise<void> => {
  await db.runAsync("DELETE FROM events WHERE id = ?", [id]);
};

/**
 * 根据 ID 获取事件
 * @param id 事件 ID
 * @returns 事件对象，不存在则返回 null
 */
const getEventById = async (id: string): Promise<Event | null> => {
  const row = await db.getFirstAsync("SELECT * FROM events WHERE id = ?", [id]);
  return row ? mapRowToEvent(row) : null;
};

/**
 * 获取指定日期范围内的事件
 * @param start 开始时间（ISO 格式，包含）
 * @param end 结束时间（ISO 格式，不包含）
 * @returns 事件数组，按开始时间排序
 */
const getEventsByDateRange = async (start: string, end: string): Promise<Event[]> => {
  const rows = await db.getAllAsync(
    "SELECT * FROM events WHERE start_time >= ? AND start_time < ? ORDER BY start_time ASC",
    [start, end]
  );
  return rows.map(mapRowToEvent);
};

/**
 * 获取所有事件
 * @returns 所有事件数组，按开始时间排序
 */
const getAllEvents = async (): Promise<Event[]> => {
  const rows = await db.getAllAsync("SELECT * FROM events ORDER BY start_time ASC");
  return rows.map(mapRowToEvent);
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

  await db.runAsync("DELETE FROM events");

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
