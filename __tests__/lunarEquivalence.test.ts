import { describe, test, expect } from "vitest";
// @ts-expect-error — legacy CommonJS module, no .d.ts
import { Solar as LegacySolar } from "../lib/lunar-javascript/index.js";
import {
  toLunarDate,
  getSolarTerm,
  getGanZhi,
} from "../src/domain/lunar";

interface LegacyLunar {
  getYear(): number;
  getMonth(): number;
  getDay(): number;
  getYearInGanZhi(): string;
  getMonthInGanZhi(): string;
  getDayInGanZhi(): string;
  getMonthInChinese(): string;
  getDayInChinese(): string;
  getYearShengXiao(): string;
  getJieQi(): string;
}

interface LegacySolarType {
  getLunar(): LegacyLunar;
}

const generateSampleDates = (startYear: number, endYear: number): string[] => {
  const out: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 15, 28]) {
        out.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
      }
    }
  }
  return out;
};

const dates = generateSampleDates(2000, 2050);

describe("lunar equivalence (new TS port vs lunar-javascript)", () => {
  describe.each(dates.slice(0, 100))("warmup date=%s", (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const legacySolar = LegacySolar.fromDate(d) as LegacySolarType;
    const legacyLunar = legacySolar.getLunar();

    test("toLunarDate", () => {
      const ours = toLunarDate(d);
      expect(ours.year).toBe(legacyLunar.getYear());
      expect(ours.month).toBe(legacyLunar.getMonth());
      expect(ours.day).toBe(legacyLunar.getDay());
      expect(ours.yearGanZhi).toBe(legacyLunar.getYearInGanZhi());
      expect(ours.monthGanZhi).toBe(legacyLunar.getMonthInGanZhi());
      expect(ours.dayGanZhi).toBe(legacyLunar.getDayInGanZhi());
      expect(ours.monthName).toBe(legacyLunar.getMonthInChinese());
      expect(ours.dayName).toBe(legacyLunar.getDayInChinese());
      expect(ours.yearShengXiao).toBe(legacyLunar.getYearShengXiao());
    });

    test("getSolarTerm", () => {
      const ours = getSolarTerm(d);
      const legacy = legacyLunar.getJieQi();
      if (legacy) {
        expect(ours?.name).toBe(legacy);
      } else {
        expect(ours).toBeNull();
      }
    });

    test("getGanZhi", () => {
      const ours = getGanZhi(d);
      expect(ours.year).toBe(legacyLunar.getYearInGanZhi());
      expect(ours.month).toBe(legacyLunar.getMonthInGanZhi());
      expect(ours.day).toBe(legacyLunar.getDayInGanZhi());
    });
  });

  describe.each(dates)("full date=%s", (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const legacySolar = LegacySolar.fromDate(d) as LegacySolarType;
    const legacyLunar = legacySolar.getLunar();

    test("toLunarDate (full)", () => {
      const ours = toLunarDate(d);
      expect(ours.year).toBe(legacyLunar.getYear());
      expect(ours.month).toBe(legacyLunar.getMonth());
      expect(ours.day).toBe(legacyLunar.getDay());
    });
  });
});
