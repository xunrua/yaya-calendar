# YAYA 项目注释规范

> 基于项目现有代码风格总结，所有注释使用中文。

---

## 1. 总体原则

| 原则 | 说明 |
|------|------|
| **用中文注释** | 业务逻辑、字段说明、区块标题统一使用中文 |
| **注释"为什么"而非"是什么"** | 代码本身能表达"做什么"，注释解释"为什么这样做" |
| **不注释显而易见的代码** | `i++`、`return true` 等无需注释 |
| **保持注释与代码同步** | 修改代码时同步更新注释，过期注释比没有注释更糟 |

---

## 2. 文件头注释

每个文件顶部可选添加一行说明，描述文件的职责和归属。

```ts
// 核心领域类型定义

// Web 平台数据库实现（使用 Dexie / IndexedDB）
```

**规则：**
- 使用单行 `//` 注释
- 一句话说明文件的职责、平台归属或特殊背景
- 不需要作者、日期、版本号（由 git 管理）
- 组件文件（`.tsx`）一般不加文件头注释

---

## 3. 区块分隔符

用于在文件内划分逻辑区域，例如类型分组、store 状态与 action 分隔。

```ts
// ============================================================================
// 事件类型
// ============================================================================

// ============================================================================
// 主题类型
// ============================================================================

// ============================================================================
// 农历服务
// ============================================================================
```

**规则：**
- 上下各一行 `// ===...===`（76 个 `=`）
- 中间一行 `// 区块名称`
- 区块名称使用中文
- 用于 interface / type 分组、store state 与 actions 分隔、service 内部模块分组

---

## 4. JSDoc 函数注释

对 **export 的公共函数** 使用 JSDoc 格式注释。

### 4.1 工具函数（完整 JSDoc）

```ts
/**
 * 计算指定月份的日历行数
 * @param year 年份
 * @param month 月份（0-indexed，0 = 一月）
 * @returns 行数（4-6）
 */
export function getCalendarRowCount(year: number, month: number): number {
  // ...
}
```

### 4.2 服务函数（简短 JSDoc）

```ts
/**
 * 将公历日期转换为农历日期
 */
export const toLunarDate = (date: Date): LunarDate => {
  // ...
};
```

### 4.3 有副作用或复杂逻辑时补充说明

```ts
/**
 * 获取日历视图中的农历日文字
 * - 每月第一天显示月份名（如"正月"）
 * - 其他日期显示日名（如"初二"、"十五"）
 */
export const getLunarDayDisplay = (date: Date): string => {
  // ...
};
```

**规则：**
- 第一行：一句话概括功能（中文）
- `@param` 每个参数一行，说明含义和特殊取值
- `@returns` 说明返回值含义
- 有分支逻辑时用 `-` 列出各情况
- 非 export 的内部函数不强制要求 JSDoc

---

## 5. 类型 / 接口注释

### 5.1 接口属性注释

对含义不明显的属性使用行尾注释：

```ts
export interface Event {
  startTime: string; // ISO 8601 格式，含时区："2024-03-15T10:00:00+08:00"
  color: string; // 十六进制颜色码，如 "#6366F1"
  recurrenceException?: string[]; // 需要排除的重复日期（ISO 格式）
  timezone?: string; // IANA 时区标识符，如 "Asia/Shanghai"
}
```

### 5.2 类型分组注释

当接口属性较多时，用行内注释标注分组：

```ts
export interface ThemeColors {
  // 基础色
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // 日历专用色
  todayBackground: string;
  selectedBackground: string;
  lunarText: string;
}
```

**规则：**
- 属性名本身已经明确含义的（如 `id`、`title`），不加注释
- 格式、范围、特殊取值需要注释（如 ISO 格式、枚举含义）
- 注释放在行尾，用 `//` 加一个空格

---

## 6. 行内注释

### 6.1 常量说明

```ts
const EVENT_COLORS = [
  "#6366F1", // 靛蓝
  "#8B5CF6", // 紫罗兰
  "#EC4899", // 粉红
];
```

### 6.2 魔法数字 / 常量说明

```ts
const HORIZONTAL_MARGIN = 32; // 左右各 16
const ROW_GAP = 8;
```

### 6.3 特殊逻辑说明

```ts
isLeapMonth: lunar.getMonth() < 0, // 负数表示闰月
const cellHeight = cellWidth; // aspectRatio: 1，宽高相等
```

### 6.4 接口分组标注

```ts
interface EventState {
  events: Event[];
  loading: boolean;

  // 操作方法
  loadEvents: () => Promise<void>;
  createEvent: (...) => Promise<Event>;
}
```

**规则：**
- `//` 后加一个空格
- 注释与代码在同一行，或在代码上方独占一行
- 不重复代码已经表达的信息

---

## 7. JSX 注释

在 JSX 中使用 `{/* */}` 格式：

```tsx
<View>
  {/* 标题区域 */}
  <Text style={styles.title}>{event.title}</Text>

  {/* 日期选择器 */}
  <DatePicker value={date} onChange={setDate} />

  {/* 颜色选择 */}
  <ColorPicker colors={EVENT_COLORS} selected={color} onSelect={setColor} />
</View>
```

**规则：**
- 用于标注 JSX 中的功能区域
- 不对每个元素都加注释，只在区域边界处标注
- 多行 JSX 结构中用于分隔逻辑块

---

## 8. 不注释的情况

以下情况 **不需要** 添加注释：

```ts
// ❌ 不要这样做

// 设置标题（显而易见）
setTitle("hello");

// 如果标题为空则返回（代码已表达）
if (!title.trim()) {
  return;
}

// 遍历事件（forEach 语义明确）
events.forEach((e) => console.log(e));
```

**需要注释的例外：**
- 不是"做什么"而是"为什么"——`// 避免闪烁，延迟 300ms 渲染`
- 不是"怎么做"而是"业务原因"——`// 农历每月第一天特殊显示月份名`
- 妥协方案——`// 临时方案，等待上游修复 #123`

---

## 9. 示例对照

### 组件文件

```tsx
// components/calendar/MonthGrid.tsx

import { StyleSheet, View } from "react-native";

interface MonthGridProps {
  year: number;
  month: number;
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  year,
  month,
  selectedDate,
  onDateSelect,
}) => {
  const rows = getCalendarRowCount(year, month);

  return (
    <View style={styles.container}>
      {/* 星期表头 */}
      <WeekdayHeader />

      {/* 日期网格 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <WeekRow key={rowIndex} rowIndex={rowIndex} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### 服务文件

```ts
// services/database.ts

import { default as Dexie, type Table } from "dexie";
import type { Event } from "../domain/types";

// Web 平台数据库实现（使用 Dexie / IndexedDB）

class YayaDatabase extends Dexie {
  events!: Table<Event, string>;

  constructor() {
    super("YayaCalendarDB");
    this.version(1).stores({
      events: "id, startTime, endTime",
    });
  }
}

/**
 * 初始化数据库连接
 * 必须在其他数据库操作之前调用
 */
const initDatabase = async (): Promise<void> => {
  db = new YayaDatabase();
  await db.open();
};

/**
 * 创建事件
 * 自动生成 id、createdAt、updatedAt
 */
const createEvent = async (
  eventData: Omit<Event, "id" | "createdAt" | "updatedAt">
): Promise<Event> => {
  const now = new Date().toISOString();
  const event: Event = {
    ...eventData,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  await getDb().events.add(event);
  return event;
};
```

### Store 文件

```ts
// stores/eventStore.ts

import { create } from "zustand";
import type { Event } from "../domain/types";

// ============================================================================
// 事件 Store 状态
// ============================================================================

interface EventState {
  events: Event[];
  loading: boolean;
  error: string | null;

  // 操作方法
  loadEvents: () => Promise<void>;
  createEvent: (event: Omit<Event, "id" | "createdAt" | "updatedAt">) => Promise<Event>;
}

// ============================================================================
// 事件 Store
// ============================================================================

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  loading: false,
  error: null,

  /** 加载所有事件，失败时设置 error 状态 */
  loadEvents: async () => {
    set({ loading: true, error: null });
    try {
      const events = await database.getAllEvents();
      set({ events, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));
```

---

## 10. 快速检查清单

- [ ] 所有注释使用中文
- [ ] export 函数有 JSDoc（至少一句话描述）
- [ ] 区块分隔符格式一致（76 个 `=`）
- [ ] 类型属性的格式、范围已注释
- [ ] 魔法数字有行尾注释说明含义
- [ ] 没有注释显而易见的代码
- [ ] 没有过期或错误的注释
