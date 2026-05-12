// Lunar 模块 — 端口自 lib/lunar-javascript/lunar.js Lunar (L630-...)
// 农历日期 + 干支 + 节气 + 节日。
//
// 算法策略:
// - 干支年: 正月初一版(yearGanIndex/yearZhiIndex),对应 lunar.js getYearInGanZhi。
// - 干支月: 立春版(monthGanIndex/monthZhiIndex,_computeMonth 第一段),对应 getMonthInGanZhi。
// - 干支日: 正午版(dayGanIndex/dayZhiIndex,非 23:00 漂移),对应 getDayInGanZhi。

import {
  BASE_MONTH_ZHI_INDEX,
  GAN,
  JIE_QI_IN_USE,
  LUNAR_DAY_CN,
  LUNAR_MONTH_CN,
  SHENGXIAO,
  ZHI,
} from "./constants";
import { LUNAR_FESTIVALS } from "./festivals";
import { getLunarYear, type LunarYearData } from "./lunarYear";
import { getJulianDay, type SolarDate, solarFromJulianDay, solarFromYmd } from "./solar";

export interface LunarDate {
  year: number;
  month: number; // 负数代表闰月
  day: number;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  shengXiao: string;
  monthInChinese: string;
  dayInChinese: string;
  jieQi: string | null;
  festivals: string[];
  solar: SolarDate;
}

// 节气英文 token → 中文映射 — lunar.js _convertJieQi (L1246-1263)
const JIE_QI_NAME_BY_TOKEN: Record<string, string> = {
  DA_XUE: "大雪",
  DONG_ZHI: "冬至",
  XIAO_HAN: "小寒",
  DA_HAN: "大寒",
  LI_CHUN: "立春",
  YU_SHUI: "雨水",
  JING_ZHE: "惊蛰",
};

const convertJieQi = (key: string): string => JIE_QI_NAME_BY_TOKEN[key] ?? key;

// ============================================================================
// 内部 helper
// ============================================================================

// L641-704 — 立春版年干支(o.yearGanIndexByLiChun / yearZhiIndexByLiChun)
// 暴露用 正月初一版(yearGanIndex / yearZhiIndex),lunar.js getYearInGanZhi 对应这个。
// 但 _computeMonth 需要 yearGanIndexByLiChun,所以两个都算。
interface YearGz {
  yearGanIndex: number;
  yearZhiIndex: number;
  yearGanIndexByLiChun: number;
  yearZhiIndexByLiChun: number;
}

function computeYearGanZhi(
  jieQi: Record<string, SolarDate>,
  solar: SolarDate,
  lunarYear: number
): YearGz {
  const offset = lunarYear - 4;
  let yearGanIndex = offset % 10;
  let yearZhiIndex = offset % 12;
  if (yearGanIndex < 0) yearGanIndex += 10;
  if (yearZhiIndex < 0) yearZhiIndex += 12;

  let g = yearGanIndex;
  let z = yearZhiIndex;

  const solarYear = solar.year;
  const solarYmd = ymd(solar);

  // 立春的阳历日期(优先用中文,fallback 用英文 token)
  let liChun = jieQi.立春;
  if (!liChun || liChun.year !== solarYear) {
    liChun = jieQi.LI_CHUN;
  }
  const liChunYmd = ymd(liChun);

  if (lunarYear === solarYear) {
    if (solarYmd < liChunYmd) {
      g--;
      z--;
    }
  } else if (lunarYear < solarYear) {
    if (solarYmd >= liChunYmd) {
      g++;
      z++;
    }
  }

  return {
    yearGanIndex,
    yearZhiIndex,
    yearGanIndexByLiChun: ((g % 10) + 10) % 10,
    yearZhiIndexByLiChun: ((z % 12) + 12) % 12,
  };
}

// L705-742 — 月干支(立春版,与 lunar.js getMonthInGanZhi 对应)
function computeMonthGanZhi(
  jieQi: Record<string, SolarDate>,
  solar: SolarDate,
  yearGanIndexByLiChun: number
): { monthGanIndex: number; monthZhiIndex: number } {
  // 序号:大雪以前 -3, 大雪到小寒之间 -2, 小寒到立春之间 -1, 立春之后 0...
  let start: SolarDate | null = null;
  let index = -3;
  const size = JIE_QI_IN_USE.length;
  const solarYmd = ymd(solar);
  for (let i = 0; i < size; i += 2) {
    const end = jieQi[JIE_QI_IN_USE[i]];
    const symd = start === null ? solarYmd : ymd(start);
    if (solarYmd >= symd && solarYmd < ymd(end)) {
      break;
    }
    start = end;
    index++;
  }
  const offset = ((((yearGanIndexByLiChun + (index < 0 ? 1 : 0)) % 5) + 1) * 2) % 10;
  const monthGanIndex = ((index < 0 ? index + 10 : index) + offset) % 10;
  const monthZhiIndex = ((index < 0 ? index + 12 : index) + BASE_MONTH_ZHI_INDEX) % 12;
  return { monthGanIndex, monthZhiIndex };
}

// L743-768 — 日干支(正午版)
function computeDayGanZhi(solar: SolarDate): { dayGanIndex: number; dayZhiIndex: number } {
  const noon = solarFromYmd(solar.year, solar.month, solar.day, 12, 0, 0);
  const offset = Math.floor(getJulianDay(noon)) - 11;
  let dayGanIndex = offset % 10;
  let dayZhiIndex = offset % 12;
  if (dayGanIndex < 0) dayGanIndex += 10;
  if (dayZhiIndex < 0) dayZhiIndex += 12;
  return { dayGanIndex, dayZhiIndex };
}

// L1285-1293 / L1246-1263 — 当日节气名(或 null)
function findJieQiOfDay(jieQi: Record<string, SolarDate>, solar: SolarDate): string | null {
  for (const key in jieQi) {
    const d = jieQi[key];
    if (d.year === solar.year && d.month === solar.month && d.day === solar.day) {
      return convertJieQi(key);
    }
  }
  return null;
}

// L1321-1331 — 农历节日(LUNAR_FESTIVALS + 除夕特判)
function lunarFestivalsOf(
  month: number,
  day: number,
  lunarYear: number,
  ly: LunarYearData
): string[] {
  const l: string[] = [];
  const key = `${month}-${day}`;
  const f = LUNAR_FESTIVALS[key as keyof typeof LUNAR_FESTIVALS];
  if (f) l.push(f);
  // 除夕:腊月 29/30 且次日不在本农历年(即本月是年末)
  if (Math.abs(month) === 12 && day >= 29) {
    // 求次日的农历年,如果不同则今日是除夕
    const nextLunarYear = nextDayLunarYear(lunarYear, month, day, ly);
    if (lunarYear !== nextLunarYear) {
      l.push("除夕");
    }
  }
  return l;
}

function nextDayLunarYear(
  lunarYear: number,
  month: number,
  day: number,
  ly: LunarYearData
): number {
  // 找本月,看 day+1 是否超过 dayCount;超过则查 ly 月表的下一个月
  const ms = ly.months;
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    if (m.year === lunarYear && m.month === month) {
      if (day + 1 <= m.dayCount) {
        return lunarYear;
      }
      // 看下一个 月份的 year
      if (i + 1 < ms.length) {
        return ms[i + 1].year;
      }
      // 跨年到下一个农历年
      const nextLy = getLunarYear(lunarYear + 1);
      const nm = nextLy.months[0];
      return nm.year;
    }
  }
  return lunarYear;
}

// 内部 ymd 字符串助手(year-month-day,padding 后可字典序比较)
function ymd(s: SolarDate): string {
  return (
    String(s.year).padStart(4, "0") +
    "-" +
    String(s.month).padStart(2, "0") +
    "-" +
    String(s.day).padStart(2, "0")
  );
}

// ============================================================================
// 公开 API
// ============================================================================

// L631-639 — 节气字典(英文 token + 中文 alias 都存)
function buildJieQiMap(ly: LunarYearData): Record<string, SolarDate> {
  const map: Record<string, SolarDate> = {};
  const days = ly.jieQiJulianDays;
  for (let i = 0; i < JIE_QI_IN_USE.length; i++) {
    const key = JIE_QI_IN_USE[i];
    const s = solarFromJulianDay(days[i]);
    map[key] = s;
    // 中文 alias(给立春/大雪/... 同时挂中文 key,_computeYear / _computeMonth 用中文查表)
    const chinese = convertJieQi(key);
    if (chinese !== key && !(chinese in map)) {
      map[chinese] = s;
    }
  }
  return map;
}

function assemble(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  solar: SolarDate,
  ly: LunarYearData
): LunarDate {
  const jieQi = buildJieQiMap(ly);
  const y = computeYearGanZhi(jieQi, solar, lunarYear);
  const m = computeMonthGanZhi(jieQi, solar, y.yearGanIndexByLiChun);
  const d = computeDayGanZhi(solar);

  const yearGanZhi = GAN[y.yearGanIndex + 1] + ZHI[y.yearZhiIndex + 1];
  const monthGanZhi = GAN[m.monthGanIndex + 1] + ZHI[m.monthZhiIndex + 1];
  const dayGanZhi = GAN[d.dayGanIndex + 1] + ZHI[d.dayZhiIndex + 1];

  const shengXiao = SHENGXIAO[y.yearZhiIndex + 1];
  const monthInChinese = (lunarMonth < 0 ? "闰" : "") + LUNAR_MONTH_CN[Math.abs(lunarMonth)];
  const dayInChinese = LUNAR_DAY_CN[lunarDay];

  const jq = findJieQiOfDay(jieQi, solar);
  const festivals = lunarFestivalsOf(lunarMonth, lunarDay, lunarYear, ly);

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    yearGanZhi,
    monthGanZhi,
    dayGanZhi,
    shengXiao,
    monthInChinese,
    dayInChinese,
    jieQi: jq,
    festivals,
    solar,
  };
}

// L787-804 — 从公历日期反求农历
export function lunarFromSolar(solar: SolarDate): LunarDate {
  let ly = getLunarYear(solar.year);
  let lunarYear = 0;
  let lunarMonth = 0;
  let lunarDay = 0;

  const solarJd = Math.floor(getJulianDay(solar) + 0.5);
  for (let i = 0; i < ly.months.length; i++) {
    const m = ly.months[i];
    const days = solarJd - Math.floor(m.firstJulianDay + 0.5);
    if (days >= 0 && days < m.dayCount) {
      lunarYear = m.year;
      lunarMonth = m.month;
      lunarDay = days + 1;
      break;
    }
  }
  // 该年的月历可能不覆盖跨年首尾 — fallback 到相邻年
  if (lunarYear === 0) {
    const tryYears = [solar.year - 1, solar.year + 1];
    for (const ty of tryYears) {
      const tly = getLunarYear(ty);
      for (let i = 0; i < tly.months.length; i++) {
        const m = tly.months[i];
        const days = solarJd - Math.floor(m.firstJulianDay + 0.5);
        if (days >= 0 && days < m.dayCount) {
          lunarYear = m.year;
          lunarMonth = m.month;
          lunarDay = days + 1;
          ly = tly;
          break;
        }
      }
      if (lunarYear !== 0) break;
    }
  }
  return assemble(lunarYear, lunarMonth, lunarDay, solar, ly);
}

// L808-866 — 从农历 ymd 反求公历
export function lunarFromYmd(year: number, month: number, day: number): LunarDate {
  if (!Number.isFinite(year)) throw new Error(`wrong lunar year ${year}`);
  if (!Number.isFinite(month)) throw new Error(`wrong lunar month ${month}`);
  if (!Number.isFinite(day)) throw new Error(`wrong lunar day ${day}`);
  if (day < 1) throw new Error("lunar day must bigger than 0");

  let ly = getLunarYear(year);
  const target = ly.months.find((m) => m.year === year && m.month === month);
  if (!target) {
    throw new Error(`wrong lunar year ${year} month ${month}`);
  }
  if (day > target.dayCount) {
    throw new Error(`only ${target.dayCount} days in lunar year ${year} month ${month}`);
  }
  // firstJulianDay 为该月初一的 noon julian day(LunarYear 的 hs[i] + J2000 是中午)
  const noon = solarFromJulianDay(target.firstJulianDay + day - 1);
  const solar = solarFromYmd(noon.year, noon.month, noon.day, 0, 0, 0);
  if (noon.year !== year) {
    ly = getLunarYear(noon.year);
  }
  return assemble(year, month, day, solar, ly);
}
