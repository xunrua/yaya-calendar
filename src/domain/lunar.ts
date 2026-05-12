import { eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";

import type { Holiday, LunarDate, SolarTerm } from "../domain/types";
import {
  lunarFromSolar,
  lunarFromYmd,
  solarFromDate,
  solarFestivals,
  getSolarMonthDays,
  type SolarDate,
} from "./lunarCalc";

// ============================================================================
// Lunar Calendar Cache
// ============================================================================

/** 农历信息缓存结构 */
interface CachedLunarInfo {
  lunarDay: string;
  solarTerm?: string;
  holiday?: string;
  isHoliday: boolean;
  isSolarTerm: boolean;
}

/** 月级缓存，key 为 "yyyy-MM"，value 为日期到农历信息的映射 */
const lunarMonthCache = new Map<string, Map<string, CachedLunarInfo>>();

/** 法定假日月级缓存，key 为 "yyyy-MM" (weekStartsOn:0)，value 为日期字符串 Set */
const holidayMonthCache = new Map<string, Set<string>>();

/** 最大缓存月份数 */
const MAX_CACHE_SIZE = 12;

/**
 * 清除农历缓存（事件变更时调用）
 */
export const clearLunarCache = () => {
  lunarMonthCache.clear();
  holidayMonthCache.clear();
};

// ============================================================================
// 内部 helper
// ============================================================================

const solarToDate = (s: SolarDate): Date =>
  new Date(s.year, s.month - 1, s.day, s.hour, s.minute, s.second);

const solarToIsoDate = (s: SolarDate): string =>
  `${String(s.year).padStart(4, "0")}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`;

// ============================================================================
// Lunar Calendar Service
// ============================================================================

/**
 * Convert a Gregorian date to Chinese lunar date
 */
export const toLunarDate = (date: Date): LunarDate => {
  const solar = solarFromDate(date);
  const lunar = lunarFromSolar(solar);

  return {
    year: lunar.year,
    month: lunar.month,
    day: lunar.day,
    isLeapMonth: lunar.month < 0, // Negative month indicates leap month
    monthName: lunar.monthInChinese,
    dayName: lunar.dayInChinese,
    yearGanZhi: lunar.yearGanZhi,
    monthGanZhi: lunar.monthGanZhi,
    dayGanZhi: lunar.dayGanZhi,
    yearShengXiao: lunar.shengXiao,
  };
};

/**
 * Convert a Chinese lunar date to Gregorian date
 */
export const toSolarDate = (
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth = false
): Date => {
  const lunar = lunarFromYmd(lunarYear, isLeapMonth ? -lunarMonth : lunarMonth, lunarDay);
  return solarToDate(lunar.solar);
};

/**
 * Get lunar day display text for calendar view
 * - First day of month: show month name (e.g., "正月")
 * - Other days: show day name (e.g., "初二", "十五")
 */
export const getLunarDayDisplay = (date: Date): string => {
  const lunar = toLunarDate(date);
  if (lunar.day === 1) {
    return lunar.monthName;
  }
  return lunar.dayName;
};

// ============================================================================
// Solar Terms (二十四节气)
// ============================================================================

// Solar terms in order (二十四节气)
const SOLAR_TERMS = [
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "处暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
  "冬至",
];

/**
 * Get the solar term for a specific date (if any)
 */
export const getSolarTerm = (date: Date): SolarTerm | null => {
  const solar = solarFromDate(date);
  const lunar = lunarFromSolar(solar);
  const jieQi = lunar.jieQi;

  if (jieQi) {
    return {
      name: jieQi,
      date: date.toISOString().split("T")[0],
      index: SOLAR_TERMS.indexOf(jieQi),
    };
  }
  return null;
};

/**
 * Get all solar terms for a year
 */
export const getSolarTermsForYear = (year: number): SolarTerm[] => {
  const terms: SolarTerm[] = [];

  // Iterate through the year to find solar terms
  for (let month = 1; month <= 12; month++) {
    const days = getSolarMonthDays(year, month);
    for (const day of days) {
      const lunar = lunarFromSolar(day);
      const jieQi = lunar.jieQi;
      if (jieQi) {
        terms.push({
          name: jieQi,
          date: solarToIsoDate(day),
          index: SOLAR_TERMS.indexOf(jieQi),
        });
      }
    }
  }

  return terms.sort((a, b) => a.index - b.index);
};

// ============================================================================
// Holidays and Festivals
// ============================================================================

/**
 * Get holidays/festivals for a specific date
 */
export const getHolidays = (date: Date): Holiday[] => {
  const solar = solarFromDate(date);
  const lunar = lunarFromSolar(solar);
  const holidays: Holiday[] = [];

  // Check lunar festivals (traditional Chinese holidays)
  for (const festival of lunar.festivals) {
    holidays.push({
      name: festival,
      date: date.toISOString().split("T")[0],
      type: "traditional",
      isHoliday: isTraditionalHoliday(festival),
    });
  }

  // Check solar festivals
  for (const festival of solarFestivals(solar)) {
    holidays.push({
      name: festival,
      date: date.toISOString().split("T")[0],
      type: "statutory",
      isHoliday: isStatutoryHoliday(festival),
    });
  }

  // Check solar term
  if (lunar.jieQi) {
    holidays.push({
      name: lunar.jieQi,
      date: date.toISOString().split("T")[0],
      type: "solar_term",
      isHoliday: false,
    });
  }

  return holidays;
};

/**
 * Traditional Chinese holidays that are days off
 */
const TRADITIONAL_HOLIDAYS = ["春节", "元宵节", "清明节", "端午节", "中秋节", "重阳节", "除夕"];

const isTraditionalHoliday = (name: string): boolean => {
  return TRADITIONAL_HOLIDAYS.includes(name);
};

/**
 * Statutory holidays in China
 */
const STATUTORY_HOLIDAYS = ["元旦", "春节", "清明节", "劳动节", "端午节", "中秋节", "国庆节"];

const isStatutoryHoliday = (name: string): boolean => {
  return STATUTORY_HOLIDAYS.includes(name);
};

/**
 * Check if a date is a holiday (day off)
 */
export const isHoliday = (date: Date): boolean => {
  const holidays = getHolidays(date);
  return holidays.some((h) => h.isHoliday);
};

/**
 * Check if a date is a solar term
 */
export const isSolarTermDay = (date: Date): boolean => {
  const solar = solarFromDate(date);
  const lunar = lunarFromSolar(solar);
  return lunar.jieQi !== null;
};

/**
 * Get the primary holiday/festival name for display
 */
export const getHolidayDisplay = (date: Date): string | null => {
  const holidays = getHolidays(date);
  // Prioritize traditional holidays and statutory holidays over solar terms
  const priorityHolidays = holidays.filter((h) => h.type !== "solar_term");
  if (priorityHolidays.length > 0) {
    return priorityHolidays[0].name;
  }
  // Then show solar term if no other holiday
  const solarTermHoliday = holidays.find((h) => h.type === "solar_term");
  if (solarTermHoliday) {
    return solarTermHoliday.name;
  }
  return null;
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get comprehensive lunar info for a date (for calendar cell display)
 */
export const getLunarInfo = (
  date: Date
): {
  lunarDay: string;
  solarTerm?: string;
  holiday?: string;
  isHoliday: boolean;
  isSolarTerm: boolean;
} => {
  const lunarDay = getLunarDayDisplay(date);
  const solarTerm = getSolarTerm(date);
  const holiday = getHolidayDisplay(date);
  const isHolidayDay = isHoliday(date);
  const isSolarTermDayFlag = isSolarTermDay(date);

  return {
    lunarDay,
    solarTerm: solarTerm?.name ?? undefined,
    holiday: holiday ?? undefined,
    isHoliday: isHolidayDay,
    isSolarTerm: isSolarTermDayFlag,
  };
};

/**
 * 批量获取整月的农历信息（带缓存）
 * @param year 年份
 * @param month 月份（0-indexed，0 = 一月）
 * @returns 日期字符串到农历信息的映射
 */
export const getLunarInfoBatch = (year: number, month: number): Map<string, CachedLunarInfo> => {
  const cacheKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // 检查缓存
  if (lunarMonthCache.has(cacheKey)) {
    return lunarMonthCache.get(cacheKey)!;
  }

  // LRU 淘汰：缓存超过上限时清除最早的
  if (lunarMonthCache.size >= MAX_CACHE_SIZE) {
    const firstKey = lunarMonthCache.keys().next().value;
    if (firstKey) {
      lunarMonthCache.delete(firstKey);
    }
  }

  // 计算整月的农历信息
  const result = new Map<string, CachedLunarInfo>();
  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  for (const day of days) {
    const dateStr = day.toISOString().split("T")[0];
    const lunarDay = getLunarDayDisplay(day);
    const solarTerm = getSolarTerm(day);
    const holiday = getHolidayDisplay(day);
    const isHolidayDay = isHoliday(day);
    const isSolarTermDayFlag = isSolarTermDay(day);

    result.set(dateStr, {
      lunarDay,
      solarTerm: solarTerm?.name ?? undefined,
      holiday: holiday ?? undefined,
      isHoliday: isHolidayDay,
      isSolarTerm: isSolarTermDayFlag,
    });
  }

  // 存入缓存
  lunarMonthCache.set(cacheKey, result);
  return result;
};

/**
 * 批量获取月历范围内的法定假日日期 Set（带缓存）
 * 用于 YearView 的 MiniMonthGrid 快速判断节假日,避免逐日调用 getHolidays 触发大量农历计算
 * 注意：使用 weekStartsOn: 0（周日开始），与 YearView.tsx 中的 MiniMonthGrid 一致
 * @param year 年份
 * @param month 月份（0-indexed，0 = 一月）
 * @returns 日期字符串 (yyyy-MM-dd) 的 Set,包含的日期为法定假日
 */
export const getStatutoryHolidaySetForMonth = (year: number, month: number): Set<string> => {
  const cacheKey = `holiday-${year}-${String(month + 1).padStart(2, "0")}`;

  if (holidayMonthCache.has(cacheKey)) {
    return holidayMonthCache.get(cacheKey)!;
  }

  if (holidayMonthCache.size >= MAX_CACHE_SIZE) {
    const firstKey = holidayMonthCache.keys().next().value;
    if (firstKey) {
      holidayMonthCache.delete(firstKey);
    }
  }

  const result = new Set<string>();
  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  for (const day of days) {
    const holidays = getHolidays(day);
    if (holidays.some((h) => STATUTORY_HOLIDAYS.includes(h.name))) {
      const y = day.getFullYear();
      const m = String(day.getMonth() + 1).padStart(2, "0");
      const d = String(day.getDate()).padStart(2, "0");
      result.add(`${y}-${m}-${d}`);
    }
  }

  holidayMonthCache.set(cacheKey, result);
  return result;
};

/**
 * Get Gan-Zhi (干支) representation for a date
 */
export const getGanZhi = (date: Date): { year: string; month: string; day: string } => {
  const lunar = toLunarDate(date);
  return {
    year: lunar.yearGanZhi,
    month: lunar.monthGanZhi,
    day: lunar.dayGanZhi,
  };
};

/**
 * Get ShengXiao (生肖) for a year
 */
export const getShengXiao = (year: number): string => {
  const lunar = lunarFromYmd(year, 1, 1);
  return lunar.shengXiao;
};

export default {
  toLunarDate,
  toSolarDate,
  getLunarDayDisplay,
  getSolarTerm,
  getSolarTermsForYear,
  getHolidays,
  isHoliday,
  isSolarTermDay,
  getHolidayDisplay,
  getLunarInfo,
  getLunarInfoBatch,
  getStatutoryHolidaySetForMonth,
  clearLunarCache,
  getGanZhi,
  getShengXiao,
};
