// 公历 Solar 模块 - 端口自 lib/lunar-javascript/lunar.js Solar / SolarUtil
import { SOLAR_FESTIVALS, WEEK_FESTIVALS } from './festivals';

export interface SolarDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const DAYS_OF_MONTH: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// L3755-3760
export function isLeapYear(year: number): boolean {
  if (year < 1600) {
    return year % 4 === 0;
  }
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// L3761-3781
export function getDaysOfMonth(year: number, month: number): number {
  if (year === 1582 && month === 10) {
    return 21;
  }
  const m = month - 1;
  let d = DAYS_OF_MONTH[m];
  if (m === 1 && isLeapYear(year)) {
    d++;
  }
  return d;
}

// L63-... 构造校验 + 范围
function buildSolar(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number,
  second: number,
): SolarDate {
  if (!Number.isFinite(y)) throw new Error('wrong solar year ' + y);
  if (!Number.isFinite(m)) throw new Error('wrong solar month ' + m);
  if (!Number.isFinite(d)) throw new Error('wrong solar day ' + d);
  if (!Number.isFinite(hour)) throw new Error('wrong hour ' + hour);
  if (!Number.isFinite(minute)) throw new Error('wrong minute ' + minute);
  if (!Number.isFinite(second)) throw new Error('wrong second ' + second);
  if (y === 1582 && m === 10) {
    if (d > 4 && d < 15) {
      throw new Error('wrong solar year ' + y + ' month ' + m + ' day ' + d);
    }
  }
  if (m < 1 || m > 12) throw new Error('wrong month ' + m);
  return { year: y, month: m, day: d, hour, minute, second };
}

export function solarFromDate(date: Date): SolarDate {
  return buildSolar(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
}

export function solarFromYmd(
  y: number,
  m: number,
  d: number,
  hour = 0,
  minute = 0,
  second = 0,
): SolarDate {
  return buildSolar(y, m, d, hour, minute, second);
}

// L469-487 儒略日(含 1582-10 公历改革修正)
export function getJulianDay(s: SolarDate): number {
  let y = s.year;
  let m = s.month;
  const d = s.day + ((s.second / 60 + s.minute) / 60 + s.hour) / 24;
  let n = 0;
  let g = false;
  if (y * 372 + m * 31 + Math.floor(d) >= 588829) {
    g = true;
  }
  if (m <= 2) {
    m += 12;
    y--;
  }
  if (g) {
    n = Math.floor(y / 100);
    n = 2 - n + Math.floor(n / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + n - 1524.5;
}

// L17-61 儒略日反向(Meeus)
export function solarFromJulianDay(julianDay: number): SolarDate {
  let d = Math.floor(julianDay + 0.5);
  let f = julianDay + 0.5 - d;
  let c: number;

  if (d >= 2299161) {
    c = Math.floor((d - 1867216.25) / 36524.25);
    d += 1 + c - Math.floor(c / 4);
  }
  d += 1524;
  let year = Math.floor((d - 122.1) / 365.25);
  d -= Math.floor(365.25 * year);
  let month = Math.floor(d / 30.601);
  d -= Math.floor(30.601 * month);
  let day = d;
  if (month > 13) {
    month -= 13;
    year -= 4715;
  } else {
    month -= 1;
    year -= 4716;
  }
  f *= 24;
  let hour = Math.floor(f);

  f -= hour;
  f *= 60;
  let minute = Math.floor(f);

  f -= minute;
  f *= 60;
  let second = Math.round(f);
  if (second > 59) {
    second -= 60;
    minute++;
  }
  if (minute > 59) {
    minute -= 60;
    hour++;
  }
  if (hour > 23) {
    hour -= 24;
    day += 1;
  }
  return buildSolar(year, month, day, hour, minute, second);
}

// L222-224 0=周日 1=周一 ... 6=周六
export function getWeek(s: SolarDate): number {
  return (Math.floor(getJulianDay(s) + 0.5) + 7000001) % 7;
}

// L238-256
export function solarFestivals(s: SolarDate): string[] {
  const l: string[] = [];
  const key = s.month + '-' + s.day;
  const f = SOLAR_FESTIVALS[key as keyof typeof SOLAR_FESTIVALS];
  if (f) {
    l.push(f);
  }
  const weeks = Math.ceil(s.day / 7);
  const week = getWeek(s);
  const wfKey = s.month + '-' + weeks + '-' + week;
  const wf = WEEK_FESTIVALS[wfKey as keyof typeof WEEK_FESTIVALS];
  if (wf) {
    l.push(wf);
  }
  // 月末最后一周特判: m-0-weekday
  if (s.day + 7 > getDaysOfMonth(s.year, s.month)) {
    const lastKey = s.month + '-0-' + week;
    const lf = WEEK_FESTIVALS[lastKey as keyof typeof WEEK_FESTIVALS];
    if (lf) {
      l.push(lf);
    }
  }
  return l;
}
