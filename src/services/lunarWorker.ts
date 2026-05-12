/**
 * lunarWorker.ts - Worklet 多线程农历计算
 *
 * Native: 使用 Reanimated 4.1 的 createWorkletRuntime + runOnRuntime
 *         将 lunarCalc 纯函数推到独立线程执行，避免阻塞 JS 主线程。
 * Web:    回退到主线程同步计算（createWorkletRuntime 在 Web 不可用）
 *
 * 注意：
 * - lunarCalc 所有函数都是纯函数，无 Date、无模块级可变 state、无 require
 * - 跨 runtime 边界只能传可序列化数据（number[]、string[]、plain object）
 * - Map/Set 需要 marshal 成 Array<[key, value]> 或 plain object
 * - runOnRuntime 返回的 worklet 函数签名与原函数一致，结果通过 runOnJS 回调
 */

import type { Day } from "date-fns";
import { eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { Platform } from "react-native";
import { getLunarInfoBatch, getStatutoryHolidaySetForMonth } from "../domain/lunar";
import { lunarFromSolar, type SolarDate, solarFestivals, solarFromDate } from "../domain/lunarCalc";

const isWeb = Platform.OS === "web";

// ============================================================================
// 类型定义
// ============================================================================

/** 农历信息（可序列化版本，用于跨 runtime 传输） */
export interface SerializableLunarInfo {
  lunarDay: string;
  solarTerm?: string;
  holiday?: string;
  isHoliday: boolean;
  isSolarTerm: boolean;
}

/** 法定假日判断用的节日名称列表 */
const STATUTORY_HOLIDAYS = ["元旦", "春节", "清明节", "劳动节", "端午节", "中秋节", "国庆节"];

/** 传统节日（放假日） */
const TRADITIONAL_HOLIDAYS = ["春节", "元宵节", "清明节", "端午节", "中秋节", "重阳节", "除夕"];

// ============================================================================
// Native worklet runtime（惰性初始化）
// ============================================================================

let lunarRuntime: ReturnType<typeof import("react-native-reanimated").createWorkletRuntime> | null = null;

function getLunarRuntime() {
  if (lunarRuntime) return lunarRuntime;
  const { createWorkletRuntime } = require("react-native-reanimated") as typeof import("react-native-reanimated");
  lunarRuntime = createWorkletRuntime({ name: "lunar" });
  return lunarRuntime;
}

// ============================================================================
// 内部 helper（worklet-safe）
// ============================================================================

/** SolarDate 转 ISO 日期字符串 */
const solarToIsoDate = (s: SolarDate): string =>
  `${String(s.year).padStart(4, "0")}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`;

/** 判断是否为传统节日（放假日） */
const isTraditionalHoliday = (name: string): boolean => TRADITIONAL_HOLIDAYS.includes(name);

/** 判断是否为法定假日 */
const isStatutoryHoliday = (name: string): boolean => STATUTORY_HOLIDAYS.includes(name);

/** 获取农历日显示文本 */
const getLunarDayDisplayWorklet = (lunar: ReturnType<typeof lunarFromSolar>): string => {
  if (lunar.day === 1) {
    return lunar.monthInChinese;
  }
  return lunar.dayInChinese;
};

/** 获取节日显示文本（优先传统/法定，其次节气） */
const getHolidayDisplayWorklet = (lunar: ReturnType<typeof lunarFromSolar>): string | null => {
  // 农历节日
  for (const festival of lunar.festivals) {
    if (isTraditionalHoliday(festival)) {
      return festival;
    }
  }

  // 公历节日
  const solarFest = solarFestivals(lunar.solar);
  for (const festival of solarFest) {
    if (isStatutoryHoliday(festival)) {
      return festival;
    }
  }

  // 节气
  if (lunar.jieQi) {
    return lunar.jieQi;
  }

  return null;
};

/** 判断是否为假日 */
const isHolidayWorklet = (lunar: ReturnType<typeof lunarFromSolar>): boolean => {
  // 农历节日
  for (const festival of lunar.festivals) {
    if (isTraditionalHoliday(festival)) {
      return true;
    }
  }

  // 公历节日
  const solarFest = solarFestivals(lunar.solar);
  for (const festival of solarFest) {
    if (isStatutoryHoliday(festival)) {
      return true;
    }
  }

  return false;
};

// ============================================================================
// Public API（Promise-based async）
// ============================================================================

/**
 * 异步计算整月的农历信息
 * - Native: 在 worklet 线程执行
 * - Web: 回退到主线程同步计算
 * @param year 年份
 * @param month 月份（0-indexed，0 = 一月）
 * @param weekStartsOn 周起始日（0=周日, 1=周一），默认 1
 * @returns Promise<Map<string, LunarInfo>>
 */
export const getLunarInfoBatchAsync = (
  year: number,
  month: number,
  weekStartsOn: Day = 1
): Promise<Map<string, SerializableLunarInfo>> => {
  if (isWeb) {
    // Web: 同步计算，用 Promise.resolve 包装保持接口一致
    const batch = getLunarInfoBatch(year, month);
    return Promise.resolve(new Map(batch) as Map<string, SerializableLunarInfo>);
  }

  return new Promise<Map<string, SerializableLunarInfo>>((resolve) => {
    const { runOnRuntime, runOnJS } = require("react-native-reanimated") as typeof import("react-native-reanimated");
    const runtime = getLunarRuntime();

    // 在 worklet 内部计算并直接调用 runOnJS 返回结果
    const worklet = runOnRuntime(runtime, (y: number, m: number, ws: Day) => {
      "worklet";

      const result: Array<[string, SerializableLunarInfo]> = [];

      // 计算日历范围
      const monthDate = new Date(y, m, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const calStart = startOfWeek(monthStart, { weekStartsOn: ws });
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: ws });

      const days = eachDayOfInterval({ start: calStart, end: calEnd });

      for (const day of days) {
        const dateStr = day.toISOString().split("T")[0];
        const solar = solarFromDate(day);
        const lunar = lunarFromSolar(solar);

        const lunarDay = getLunarDayDisplayWorklet(lunar);
        const solarTerm = lunar.jieQi ?? undefined;
        const holiday = getHolidayDisplayWorklet(lunar) ?? undefined;
        const isHolidayDay = isHolidayWorklet(lunar);
        const isSolarTermDay = lunar.jieQi !== null;

        result.push([
          dateStr,
          {
            lunarDay,
            solarTerm,
            holiday,
            isHoliday: isHolidayDay,
            isSolarTerm: isSolarTermDay,
          },
        ]);
      }

      // 通过 runOnJS 返回结果
      runOnJS(resolve)(new Map(result));
    });

    // 执行 worklet
    worklet(year, month, weekStartsOn);
  });
};

/**
 * 异步计算整月的法定假日日期集合
 * - Native: 在 worklet 线程执行
 * - Web: 回退到主线程同步计算
 * @param year 年份
 * @param month 月份（0-indexed，0 = 一月）
 * @returns Promise<Set<string>>
 */
export const getStatutoryHolidaySetForMonthAsync = (
  year: number,
  month: number
): Promise<Set<string>> => {
  if (isWeb) {
    // Web: 同步计算，用 Promise.resolve 包装保持接口一致
    return Promise.resolve(getStatutoryHolidaySetForMonth(year, month));
  }

  return new Promise<Set<string>>((resolve) => {
    const { runOnRuntime, runOnJS } = require("react-native-reanimated") as typeof import("react-native-reanimated");
    const runtime = getLunarRuntime();

    // 在 worklet 内部计算并直接调用 runOnJS 返回结果
    const worklet = runOnRuntime(runtime, (y: number, m: number) => {
      "worklet";

      const result: string[] = [];

      const monthDate = new Date(y, m, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

      const days = eachDayOfInterval({ start: calStart, end: calEnd });

      for (const day of days) {
        const solar = solarFromDate(day);
        const lunar = lunarFromSolar(solar);
        const dateStr = solarToIsoDate(solar);

        // 检查农历节日
        let found = false;
        for (const festival of lunar.festivals) {
          if (STATUTORY_HOLIDAYS.includes(festival)) {
            result.push(dateStr);
            found = true;
            break;
          }
        }

        // 检查公历节日
        if (!found) {
          const solarFest = solarFestivals(solar);
          for (const festival of solarFest) {
            if (STATUTORY_HOLIDAYS.includes(festival)) {
              result.push(dateStr);
              break;
            }
          }
        }
      }

      // 通过 runOnJS 返回结果
      runOnJS(resolve)(new Set(result));
    });

    // 执行 worklet
    worklet(year, month);
  });
};
