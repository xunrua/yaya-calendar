// 日历计算工具

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/**
 * 计算指定月份的日历行数
 * @param year 年份
 * @param month 月份（0-indexed，0 = 一月）
 * @returns 行数（4-6）
 */
export function getCalendarRowCount(year: number, month: number): number {
  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  return Math.ceil(days.length / 7);
}

/**
 * 计算日历网格高度
 * @param rowCount 行数
 * @param screenWidth 屏幕宽度
 * @returns 高度（px）
 */
export function calculateGridHeight(rowCount: number, screenWidth: number): number {
  const HORIZONTAL_MARGIN = 32; // 左右边距各 16dp
  const ROW_GAP = 24; // 行间距

  const cellWidth = (screenWidth - HORIZONTAL_MARGIN) / 7;
  const cellHeight = cellWidth; // 宽高比 1:1
  return rowCount * cellHeight + (rowCount - 1) * ROW_GAP;
}

/**
 * 计算单行高度
 * @param screenWidth 屏幕宽度
 * @returns 高度（px）
 */
export function calculateSingleRowHeight(screenWidth: number): number {
  const HORIZONTAL_MARGIN = 32; // 左右边距各 16dp
  const ROW_GAP = 24; // 行间距
  const cellWidth = (screenWidth - HORIZONTAL_MARGIN) / 7;
  return cellWidth + ROW_GAP;
}

/**
 * 计算日期在日历中的行索引
 * @param date 目标日期
 * @param year 年份
 * @param month 月份（0-indexed）
 * @returns 行索引（0-5）
 */
export function getRowIndexForDate(date: Date, year: number, month: number): number {
  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const dateStr = format(date, "yyyy-MM-dd");
  const dayIndex = days.findIndex((d) => format(d, "yyyy-MM-dd") === dateStr);

  if (dayIndex === -1) return 0;
  return Math.floor(dayIndex / 7);
}

/**
 * 计算指定行的顶部偏移量
 * @param rowIndex 行索引（0-5）
 * @param screenWidth 屏幕宽度
 * @returns 偏移量（px）
 */
export function calculateRowOffset(rowIndex: number, screenWidth: number): number {
  const singleRowHeight = calculateSingleRowHeight(screenWidth);
  return rowIndex * singleRowHeight;
}
