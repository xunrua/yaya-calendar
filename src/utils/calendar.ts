import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/**
 * 计算指定月份的日历行数
 * @param year 年份
 * @param month 月份 (0-indexed, 0=一月)
 * @returns 行数 (4-6)
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
 * @returns 高度 (px)
 */
export function calculateGridHeight(rowCount: number, screenWidth: number): number {
  const HORIZONTAL_MARGIN = 32; // 左右各 16
  const ROW_GAP = 8;

  const cellWidth = (screenWidth - HORIZONTAL_MARGIN) / 7;
  const cellHeight = cellWidth; // aspectRatio: 1
  return rowCount * cellHeight + (rowCount - 1) * ROW_GAP;
}
