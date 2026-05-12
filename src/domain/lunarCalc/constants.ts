// 农历计算常量表。
// 全部从 lib/lunar-javascript/lunar.js 抄写,解码 i18n token 后写为 zh-CN 字面量。
// 字符串内容必须与 lunar.js zh-CN(L7044-L7115 附近)严格一致 — 算法依赖精确比对。
//
// 关键差异提示(与日常直觉不同的地方):
// - LUNAR_MONTH_CN[11] = '冬'(不是 '十一')        — lunar.js m.eleven='冬'
// - LUNAR_MONTH_CN[12] = '腊'                       — lunar.js m.twelve='腊'
// - LUNAR_DAY_CN[20]   = '二十'(不是 '廿十')       — lunar.js d.twenty='二十'
// - LUNAR_DAY_CN[21..29] = '廿一'..'廿九'           — lunar.js d.twentyOne..d.twentyNine
// - LUNAR_DAY_CN[30]   = '三十'                      — lunar.js d.thirty='三十'
// - NUMBER[0]          = '〇'(不是 '零')           — lunar.js n.zero='〇'

// 天干 — lunar.js LunarUtil.GAN (L4001),1-indexed,[0]=空字符串
export const GAN = [
  "",
  "甲",
  "乙",
  "丙",
  "丁",
  "戊",
  "己",
  "庚",
  "辛",
  "壬",
  "癸",
] as const;

// 地支 — lunar.js LunarUtil.ZHI (L4087),1-indexed,[0]=空字符串
export const ZHI = [
  "",
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;

// 农历月名 — lunar.js LunarUtil.MONTH (L4201-4215),1-indexed
// 注意 m.eleven 在源里是 '冬'(冬月),非 '十一'。算法 getMonthInChinese 直接查表,必须保持源行为。
export const LUNAR_MONTH_CN = [
  "",
  "正",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "冬",
  "腊",
] as const;

// 农历日名 — lunar.js LunarUtil.DAY (L4232-4264),1-indexed
// 注意 d.twenty='二十' 单独使用,d.twentyOne..twentyNine='廿一'..'廿九',d.thirty='三十'。
export const LUNAR_DAY_CN = [
  "",
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十",
] as const;

// 生肖 — lunar.js LunarUtil.SHENGXIAO (L4231),1-indexed
export const SHENGXIAO = [
  "",
  "鼠",
  "牛",
  "虎",
  "兔",
  "龙",
  "蛇",
  "马",
  "羊",
  "猴",
  "鸡",
  "狗",
  "猪",
] as const;

// 数字中文 — lunar.js LunarUtil.NUMBER (L4200),0-indexed
// 注意 n.zero='〇'(圈零),非 '零'。
export const NUMBER = [
  "〇",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "十一",
  "十二",
] as const;

// 24 节气标准名称 — lunar.js LunarUtil.JIE_QI (L3886),按"冬至,小寒,...,大雪"顺序。
export const JIE_QI_NAMES = [
  "冬至",
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
] as const;

// 节气查询表 — lunar.js LunarUtil.JIE_QI_IN_USE (L3887),31 项,顺序影响算法。
//
// 结构:
//   [0]      = 'DA_XUE'        — 上一年大雪(跨年别名)
//   [1..24]  = 标准 24 节气     — 冬至,小寒,大寒,...,大雪
//   [25..30] = 'DONG_ZHI', 'XIAO_HAN', 'DA_HAN', 'LI_CHUN', 'YU_SHUI', 'JING_ZHE'
//              — 下一年开头 6 个节气的英文别名
//
// 这些英文别名在 Lunar._convertJieQi 内部被映射回标准 24 名,
// 跨年区间用别名,本年内用中文名,顺序与 i 同步,不可调整。
export const JIE_QI_IN_USE = [
  "DA_XUE",
  "冬至",
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
  "DONG_ZHI",
  "XIAO_HAN",
  "DA_HAN",
  "LI_CHUN",
  "YU_SHUI",
  "JING_ZHE",
] as const;

// 月支基准索引 — lunar.js LunarUtil.BASE_MONTH_ZHI_INDEX (L3885)。
// 用于 _computeMonth:monthZhiIndex = (i + BASE_MONTH_ZHI_INDEX) % 12。
export const BASE_MONTH_ZHI_INDEX = 2;

// ============================================================================
// 静态长度断言 — 编译期保证表长度不被意外改动。
// 若任一表长度被修改,tsc 报错。这些 const 不在运行时被使用,只是 type-level check。
// ============================================================================

type LengthOf<T extends readonly unknown[]> = T["length"];

// 防止 lint 警告 unused — 用一个 dummy export 把它们消费掉。
type _AssertLengths = [
  LengthOf<typeof GAN> extends 11 ? true : never,
  LengthOf<typeof ZHI> extends 13 ? true : never,
  LengthOf<typeof LUNAR_MONTH_CN> extends 13 ? true : never,
  LengthOf<typeof LUNAR_DAY_CN> extends 31 ? true : never,
  LengthOf<typeof SHENGXIAO> extends 13 ? true : never,
  LengthOf<typeof NUMBER> extends 13 ? true : never,
  LengthOf<typeof JIE_QI_NAMES> extends 24 ? true : never,
  LengthOf<typeof JIE_QI_IN_USE> extends 31 ? true : never,
];

export type _Internal_AssertLengths = _AssertLengths;
