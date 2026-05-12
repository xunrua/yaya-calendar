// lunarCalc 顶层 facade — 纯函数 API 替代 lunar-javascript npm 依赖
export {
  solarFromDate,
  solarFromYmd,
  solarFromJulianDay,
  getJulianDay,
  getDaysOfMonth,
  isLeapYear,
  solarFestivals,
  type SolarDate,
} from './solar';

export { lunarFromSolar, lunarFromYmd, type LunarDate } from './lunar';

export { getSolarMonthDays } from './solarMonth';

export {
  JIE_QI_NAMES,
  JIE_QI_IN_USE,
  GAN,
  ZHI,
  SHENGXIAO,
} from './constants';
