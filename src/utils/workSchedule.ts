import { differenceInDays } from "date-fns";

/**
 * 排班规则：
 * - 基准日期：2026-05-07、2026-05-08 是"班"
 * - 周期：2天班 + 2天休，循环往复
 */

const BASE_DATE = new Date(2026, 4, 7); // 2026-05-07
const CYCLE_DAYS = 4; // 2班 + 2休

export type WorkStatus = "班" | "休";

/**
 * 计算给定日期的班休状态
 */
export function getWorkStatus(date: Date): WorkStatus {
  const diffDays = differenceInDays(date, BASE_DATE);
  // 处理负数情况（基准日期之前的日期）
  const dayInCycle = ((diffDays % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS;
  return dayInCycle < 2 ? "班" : "休";
}
