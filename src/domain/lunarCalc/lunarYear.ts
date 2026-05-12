// LunarYear 模块 - 端口自 lib/lunar-javascript/lunar.js LunarYear (L2459-2788)
//
// 输出每年节气 julian day 列表 + 该年的 15 个农历月份记录(用于跨年首尾月对齐)。
// 含闰月判定(查 LEAP_11/LEAP_12 表,否则按"无中气定闰"递推)。

import { JIE_QI_IN_USE } from './constants';
import { calcQi, calcShuo, qiAccurate2, J2000 } from './shouXingUtil';
import { LEAP_11, LEAP_12, YMC } from './leapYears';

export interface LunarMonth {
  year: number;
  // 正常月用正数;闰月用负数(取绝对值即真实月份)
  month: number;
  dayCount: number;
  firstJulianDay: number;
  // 该农历年内月份的连续序号(从 1 开始)
  index: number;
}

export interface LunarYearData {
  year: number;
  ganIndex: number;
  zhiIndex: number;
  months: LunarMonth[];
  jieQiJulianDays: number[];
}

const inLeap = (arr: readonly number[], n: number): boolean => {
  for (let i = 0, j = arr.length; i < j; i++) {
    if (arr[i] === n) return true;
  }
  return false;
};

// 不缓存的原始计算 — 对应 lunar.js _fromYear (L2474-2774)
function computeRaw(lunarYear: number): LunarYearData {
  if (!Number.isFinite(lunarYear)) throw new Error('wrong lunar year ' + lunarYear);

  const offset = lunarYear - 4;
  let ganIndex = offset % 10;
  let zhiIndex = offset % 12;
  if (ganIndex < 0) ganIndex += 10;
  if (zhiIndex < 0) zhiIndex += 12;

  const jieQiJulianDays: number[] = [];
  // 节气 julian day(去 J2000 偏移的"工作量")
  const jq: number[] = [];
  // 合朔(每月初一)julian day(去 J2000)
  const hs: number[] = [];
  // 每月天数(15 个)
  const dayCounts: number[] = [];
  const months: number[] = [];

  let jd = Math.floor((lunarYear - 2000) * 365.2422 + 180);
  // 355 是 2000.12 冬至,得到靠近 jd 的冬至估计
  let w = Math.floor((jd - 355 + 183) / 365.2422) * 365.2422 + 355;
  if (calcQi(w) > jd) {
    w -= 365.2422;
  }

  // 26 个节气时刻(北京时间),从冬至开始到下一个冬至以后
  for (let i = 0; i < 26; i++) {
    jq.push(calcQi(w + 15.2184 * i));
  }
  for (let i = 0, j = JIE_QI_IN_USE.length; i < j; i++) {
    let v: number;
    if (i === 0) {
      v = qiAccurate2(jq[0] - 15.2184);
    } else if (i <= 26) {
      v = qiAccurate2(jq[i - 1]);
    } else {
      v = qiAccurate2(jq[25] + 15.2184 * (i - 26));
    }
    jieQiJulianDays.push(v + J2000);
  }

  // 冬至前的初一,今年首朔的日月黄经差 w
  w = calcShuo(jq[0]);
  if (w > jq[0]) {
    w -= 29.53;
  }
  // 递推每月初一(16 个,用于求 15 个月的天数差)
  for (let i = 0; i < 16; i++) {
    hs.push(calcShuo(w + 29.5306 * i));
  }
  for (let i = 0; i < 15; i++) {
    dayCounts.push(Math.floor(hs[i + 1] - hs[i]));
    months.push(i);
  }

  const prevYear = lunarYear - 1;
  let leapIndex = 16;
  if (inLeap(LEAP_11, lunarYear)) {
    leapIndex = 13;
  } else if (inLeap(LEAP_12, lunarYear)) {
    leapIndex = 14;
  } else if (hs[13] <= jq[24]) {
    let i = 1;
    while (hs[i + 1] > jq[2 * i] && i < 13) {
      i++;
    }
    leapIndex = i;
  }
  for (let j = leapIndex; j < 15; j++) {
    months[j] -= 1;
  }

  const out: LunarMonth[] = [];
  let fm = -1;
  let index = -1;
  let y = prevYear;
  for (let i = 0; i < 15; i++) {
    const dm = hs[i] + J2000;
    const v2 = months[i];
    let mc = YMC[((v2 % 12) + 12) % 12];
    // 历史校正窗口 — lunar.js L2747-2753
    if (1724360 <= dm && dm < 1729794) {
      mc = YMC[((v2 + 1) % 12 + 12) % 12];
    } else if (1807724 <= dm && dm < 1808699) {
      mc = YMC[((v2 + 1) % 12 + 12) % 12];
    } else if (dm === 1729794 || dm === 1808699) {
      mc = 12;
    }
    if (fm === -1) {
      fm = mc;
      index = mc;
    }
    if (mc < fm) {
      y += 1;
      index = 1;
    }
    fm = mc;
    if (i === leapIndex) {
      mc = -mc;
    } else if (dm === 1729794 || dm === 1808699) {
      mc = -11;
    }
    out.push({
      year: y,
      month: mc,
      dayCount: dayCounts[i],
      firstJulianDay: hs[i] + J2000,
      index,
    });
    index++;
  }

  return {
    year: lunarYear,
    ganIndex,
    zhiIndex,
    months: out,
    jieQiJulianDays,
  };
}

// LRU 缓存(容量 16),对应 lunar.js _CACHE_YEAR 单条缓存的强化版
const CACHE_CAPACITY = 16;
const cache = new Map<number, LunarYearData>();

export function computeLunarYear(year: number): LunarYearData {
  return computeRaw(year);
}

export function getLunarYear(year: number): LunarYearData {
  const hit = cache.get(year);
  if (hit !== undefined) {
    // LRU: 删除再插入(Map 维护插入顺序)
    cache.delete(year);
    cache.set(year, hit);
    return hit;
  }
  const data = computeRaw(year);
  cache.set(year, data);
  if (cache.size > CACHE_CAPACITY) {
    // 删最早进的
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return data;
}
