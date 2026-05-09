declare module "lunar-javascript" {
  export class Solar {
    static fromDate(date: Date): Solar;
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    getFestivals(): string[];
    toString(): string;
    getDate(): Date;
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInGanZhi(): string;
    getMonthInGanZhi(): string;
    getDayInGanZhi(): string;
    getYearShengXiao(): string;
    getJieQi(): string | null;
    getJieQiIndex(): number;
    getFestivals(): string[];
    getSolar(): Solar;
  }

  export class SolarMonth {
    static fromYm(year: number, month: number): SolarMonth;
    getDays(): Solar[];
  }
}
