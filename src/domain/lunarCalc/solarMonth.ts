// SolarMonth 模块 — 端口自 lib/lunar-javascript/lunar.js SolarMonth (L2226-2234)
import { type SolarDate, solarFromYmd, getDaysOfMonth } from './solar';

export const getSolarMonthDays = (year: number, month: number): SolarDate[] => {
  const count = getDaysOfMonth(year, month);
  const out: SolarDate[] = [];
  for (let d = 1; d <= count; d++) {
    out.push(solarFromYmd(year, month, d));
  }
  return out;
};
