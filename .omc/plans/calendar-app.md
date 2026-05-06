# YAYA 日历应用实施计划

## RALPLAN-DR 摘要

### 核心设计原则 (Principles)

1. **本地优先** - 所有数据存储在设备本地，无网络依赖，离线可用
2. **渐进增强** - 核心功能优先，动画和视觉效果作为增强层
3. **平台一致性** - iOS/Android/Web 三端共享 95% 代码，仅针对平台特性做适配
4. **性能敏感** - 动画使用原生驱动，避免 JS 线程阻塞；Web 平台采用降级策略
5. **可测试性** - 领域逻辑与 UI 分离，便于单元测试
6. **数据安全** - 数据库迁移时保护用户数据，支持回滚机制

### 决策驱动因素 (Decision Drivers)

| 优先级 | 驱动因素 | 影响 |
|--------|----------|------|
| 1 | 跨平台一致性 (iOS/Android/Web) | 选择 Expo + React Native 而非原生；Web 采用降级策略 |
| 2 | 流畅动画体验 (60fps) | 选择 Reanimated 2 + 动画库；Web 使用 CSS 动画替代 |
| 3 | 本地数据持久化 | 选择 expo-sqlite；Web 使用 IndexedDB (Dexie.js) |
| 4 | 现代 React 实践 | React 19 + TypeScript 严格模式 |
| 5 | 数据迁移安全 | 数据库版本管理 + 用户数据保护策略 |
| 6 | 中国用户需求 | 农历显示、节假日标注、传统节日支持 |

### 关键技术选型 (Viable Options)

#### 1. 状态管理方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Zustand (推荐)** | 轻量、TypeScript 友好、支持 persist 中间件 | 需要手动配置 devtools |
| Jotai | 原子化、细粒度更新 | 学习曲线较陡 |
| React Context + useReducer | 无依赖 | 性能问题、代码冗长 |

**决策**: Zustand - 平衡了简洁性、性能和 TypeScript 支持

#### 2. 数据持久化方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **expo-sqlite (推荐)** | 结构化查询、事务支持、性能好 | 需要迁移管理 |
| AsyncStorage | 简单、键值对 | 无查询能力、大数据性能差 |
| Realm | 性能优秀 | 包体积大、学习成本高 |

**决策**: expo-sqlite - 事件查询复杂度需要 SQL 能力

#### 3. 动画库选择

| 方案 | 优点 | 缺点 |
|------|------|------|
| **react-native-reanimated (已安装)** | 原生驱动、手势集成、性能最佳 | 学习曲线、调试困难 |
| Animated (RN 内置) | 官方支持 | JS 驱动、性能较差 |
| react-native-animatable | 简单易用 | 不够灵活、性能一般 |

**决策**: react-native-reanimated - 项目已安装，性能最优

#### 4. UI 组件策略

| 方案 | 优点 | 缺点 |
|------|------|------|
| **自定义组件 (推荐)** | 完全控制、无冗余、符合设计风格 | 开发工作量 |
| React Native Paper | Material Design、成熟 | 风格固定、包体积 |
| Tamagui | 跨平台样式、性能优化 | 学习曲线、包体积 |

**决策**: 自定义组件 - 实现玻璃态效果和柔和风格需要完全控制

#### 5. 农历显示方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **lunar-javascript (推荐)** | 功能完整、支持公历农历互转、节假日查询 | 包体积 ~50KB |
| calendar-lunar | 轻量 | 功能较少，无节假日 |
| 自定义实现 | 无依赖 | 算法复杂、维护成本高 |

**决策**: lunar-javascript - 成熟的农历库，支持农历日期、节气、传统节日、节假日

**农历功能范围**:
- 月视图显示农历日期（初一显示月份，其他显示日期）
- 显示二十四节气
- 显示中国传统节日（春节、中秋、端午等）
- 显示法定节假日和调休信息

---

## 数据库迁移策略

### Schema 版本管理

**版本存储方式**: 在数据库中创建 `schema_version` 表，存储当前版本号

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  migrated_at TEXT NOT NULL
);
```

### 迁移脚本模式

**文件结构**:
```
src/services/migrations/
├── index.ts           # 迁移协调器
├── 001_initial.ts     # 初始 schema
├── 002_add_reminders.ts
└── types.ts           # 迁移类型定义
```

**迁移接口**:
```typescript
interface Migration {
  version: number;
  description: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
  down: (db: SQLite.SQLiteDatabase) => Promise<void>;
}
```

### 用户数据保护策略

1. **备份机制**: 迁移前自动备份数据库到临时文件
2. **事务保护**: 每个迁移在事务中执行，失败时自动回滚
3. **验证检查**: 迁移后验证数据完整性（事件数量、关键字段）
4. **降级支持**: 保留 `down` 迁移脚本，支持版本回退

### 迁移流程

```
应用启动 → 检查 schema_version → 比对目标版本
    ↓
需要迁移? → 是 → 备份数据库 → 执行迁移事务
    ↓              ↓                    ↓
    否        成功? → 更新版本号    失败? → 恢复备份
    ↓              ↓                    ↓
继续启动      验证数据完整性       记录错误，提示用户
```

---

## 时区处理方案

### 库选择: date-fns-tz

**选择理由**:
- 项目已使用 date-fns，保持生态一致性
- 轻量 (~2KB gzip)，无额外依赖
- TypeScript 支持完善
- 支持 IANA 时区标识符

**对比**:
| 库 | 优点 | 缺点 |
|---|---|---|
| **date-fns-tz (推荐)** | 与 date-fns 无缝集成、轻量 | 功能相对基础 |
| luxon | 功能全面、国际化好 | 包体积较大 (~20KB) |
| dayjs | 极小、插件化 | 时区插件需要额外配置 |

### 时区存储策略

**存储格式**: 所有事件时间以 **ISO 8601 + 时区偏移** 存储

```typescript
interface Event {
  startTime: string;  // "2024-03-15T10:00:00+08:00"
  endTime: string;    // "2024-03-15T11:00:00+08:00"
  timezone?: string;  // 可选: "Asia/Shanghai" (用于跨时区显示)
}
```

### 跨时区显示规则

1. **本地事件**: 显示设备当前时区的时间
2. **带时区事件**: 提供切换显示模式：
   - "原时区显示": 显示事件创建时的时区时间
   - "本地时区显示": 转换为设备时区显示
3. **时区指示**: 跨时区事件显示时区标签 (如 "北京时间 10:00")

### 夏令时处理

**策略**: 使用 IANA 时区标识符，由 date-fns-tz 自动处理 DST

```typescript
import { formatInTimeZone } from 'date-fns-tz';

// 自动处理 DST 转换
const displayTime = formatInTimeZone(event.startTime, 'America/New_York', 'HH:mm');
```

**边界情况**:
- DST 跳跃小时: 提示用户选择有效时间
- 重叠小时: 显示时区偏移让用户区分

---

## 重复事件算法

### 库选择: rrule

**选择理由**:
- RFC 5545 标准实现，兼容主流日历格式
- 成熟稳定，广泛使用 (iCal, Google Calendar 兼容)
- 支持 EXDATE (排除日期) 和 RDATE (额外日期)

**对比**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| **rrule (推荐)** | RFC 标准、功能完整、社区成熟 | 包体积 ~15KB |
| 自定义实现 | 完全可控、无依赖 | 开发成本高、边界情况多 |
| date-fns eachDayOfInterval | 轻量 | 仅支持简单间隔，无复杂规则 |

### 异常处理策略

**修改单个重复事件**:
```typescript
interface Event {
  id: string;
  recurrenceRule?: RecurrenceRule;
  recurrenceExceptions?: string[];  // 排除的日期 (ISO 8601)
  modifiedInstances?: ModifiedInstance[];  // 修改的实例
}

interface ModifiedInstance {
  originalDate: string;  // 原始日期
  event: Event;          // 修改后的事件数据
}
```

**删除单个重复事件**: 将该日期加入 `recurrenceExceptions`

### 边界情况处理

| 情况 | 处理方式 |
|------|----------|
| 闰年 2/29 | 非闰年显示在 2/28 或 3/1，让用户选择 |
| 月末重复 (如 1/31 → 2月) | 显示在当月最后一天 (2/28 或 2/29) |
| 周重复跨年 | 正常计算，无需特殊处理 |
| 结束日期与开始日期冲突 | 验证时提示用户修正 |

---

## Web 平台策略

### 已知限制量化

| 功能 | iOS/Android | Web | 影响 |
|------|-------------|-----|------|
| react-native-reanimated | 60fps 原生动画 | 30-45fps (JS 线程) | 动画流畅度下降 |
| expo-sqlite | SQLite 原生 | 需要替代方案 | 数据持久化差异 |
| 玻璃态模糊效果 | 原生 BlurView | CSS backdrop-filter | 兼容性有限 |
| 手势识别 | 原生手势 | JS 模拟 | 精度略低 |

### 双路径动画实现

**平台检测**:
```typescript
// src/utils/platform.ts
import { Platform } from 'react-native';

export const supportsNativeAnimation = Platform.OS !== 'web';
export const supportsBackdropFilter = Platform.OS === 'ios' || 
  (Platform.OS === 'web' && CSS.supports('backdrop-filter', 'blur(10px)'));
```

**动画适配**:
```typescript
// src/styles/animations.ts
export const createAnimatedValue = (value: number) => {
  if (supportsNativeAnimation) {
    return new Reanimated.SharedValue(value);
  }
  // Web 回退到 Animated API
  return new Animated.Value(value);
};

export const animateTiming = (value: any, toValue: number, duration: number) => {
  if (supportsNativeAnimation) {
    return Reanimated.withTiming(toValue, { duration });
  }
  return Animated.timing(value, {
    toValue,
    duration,
    useNativeDriver: false, // Web 必须使用 JS 驱动
  });
};
```

### expo-sqlite Web 替代方案

**选择**: Dexie.js (IndexedDB 封装)

**理由**:
- 与 SQLite API 相似的 Promise 接口
- 支持复杂查询和索引
- 包体积小 (~15KB)

**实现策略**:
```typescript
// src/services/database.ts
import { Platform } from 'react-native';

let database: DatabaseAdapter;

if (Platform.OS === 'web') {
  database = new DexieAdapter();  // IndexedDB
} else {
  database = new SQLiteAdapter(); // expo-sqlite
}

// 统一接口
interface DatabaseAdapter {
  init(): Promise<void>;
  createEvent(event: Event): Promise<Event>;
  getEventsByDateRange(start: Date, end: Date): Promise<Event[]>;
  // ...
}
```

### Web 性能指标

| 指标 | 目标值 |
|------|--------|
| 首屏加载 (LCP) | < 2.5s |
| 动画帧率 | ≥ 30fps |
| 事件列表滚动 | ≥ 55fps (虚拟化列表) |
| 主题切换延迟 | < 100ms |

---

## 性能验证方法

### FPS 测量方法

**React Native (iOS/Android)**:
- 使用 Flipper Performance Monitor
- React DevTools Profiler (JS 线程)

**Web**:
- Chrome DevTools Performance 面板
- Lighthouse 性能审计

### 测试设备/浏览器矩阵

| 平台 | 设备/浏览器 | 优先级 |
|------|-------------|--------|
| iOS | iPhone 12+ (iOS 15+) | 必须 |
| iOS | iPhone SE (低端测试) | 建议 |
| Android | Pixel 6+ (Android 12+) | 必须 |
| Android | Samsung Galaxy A 系列 (低端测试) | 建议 |
| Web | Chrome 100+ | 必须 |
| Web | Safari 15+ | 必须 |
| Web | Firefox 100+ | 建议 |

### 回归测试策略

1. **每次 PR**: 运行单元测试 + 组件快照测试
2. **每周**: E2E 测试 (Detox) + 性能基准测试
3. **发布前**: 全平台手动测试 + 性能对比

**性能基准检查点**:
- 日视图滚动 FPS
- 周视图切换延迟
- 月视图渲染时间
- 主题切换动画流畅度
- 事件创建/编辑响应时间

---

## CI/CD 性能测试集成

### GitHub Actions 工作流配置

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  pull_request:
    branches: [main, master]
  schedule:
    - cron: '0 6 * * 1'  # 每周一 6:00 UTC

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun --upload.target=temporary-public-storage
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Run Flipper Performance Tests (Native)
        if: ${{ matrix.platform != 'web' }}
        run: |
          # 使用 Flipper CI 插件进行原生性能测试
          # 需要配置 EAS Build 或自托管 runner
          echo "Run Flipper performance tests"

      - name: Check Performance Thresholds
        run: |
          node scripts/check-performance-thresholds.js
```

### 性能回归阈值定义

| 指标 | 阈值 | 失败条件 |
|------|------|----------|
| Lighthouse Performance Score | >= 85 | 低于阈值则 CI 失败 |
| First Contentful Paint (FCP) | <= 1.8s | 超过阈值则警告 |
| Largest Contentful Paint (LCP) | <= 2.5s | 超过阈值则 CI 失败 |
| Cumulative Layout Shift (CLS) | <= 0.1 | 超过阈值则警告 |
| Total Blocking Time (TBT) | <= 200ms | 超过阈值则 CI 失败 |
| FPS (日视图滚动) | >= 55fps | 低于阈值则 CI 失败 |

### 自动化性能基准测试脚本

```typescript
// scripts/check-performance-thresholds.ts
import { readFileSync } from 'fs';

interface LighthouseResult {
  categories: {
    performance: { score: number };
  };
  audits: {
    'first-contentful-paint': { numericValue: number };
    'largest-contentful-paint': { numericValue: number };
    'cumulative-layout-shift': { numericValue: number };
    'total-blocking-time': { numericValue: number };
  };
}

const THRESHOLDS = {
  performanceScore: { min: 0.85, fail: true },
  fcp: { max: 1800, fail: false },       // ms
  lcp: { max: 2500, fail: true },        // ms
  cls: { max: 0.1, fail: false },
  tbt: { max: 200, fail: true },         // ms
};

function checkThresholds(results: LighthouseResult): void {
  const { categories, audits } = results;
  let hasFailure = false;

  // Performance Score
  if (categories.performance.score < THRESHOLDS.performanceScore.min) {
    console.error(`Performance Score: ${categories.performance.score} < 0.85`);
    if (THRESHOLDS.performanceScore.fail) hasFailure = true;
  } else {
    console.log(`Performance Score: ${categories.performance.score}`);
  }

  // LCP
  const lcp = audits['largest-contentful-paint'].numericValue;
  if (lcp > THRESHOLDS.lcp.max) {
    console.error(`LCP: ${lcp}ms > 2500ms`);
    if (THRESHOLDS.lcp.fail) hasFailure = true;
  } else {
    console.log(`LCP: ${lcp}ms`);
  }

  if (hasFailure) {
    process.exit(1);
  }
}
```

---

## 错误边界处理策略

### 错误边界组件位置

```
src/components/common/
├── ErrorBoundary.tsx      # 核心错误边界组件
├── ErrorFallback.tsx      # 错误回退 UI
└── withErrorBoundary.tsx  # HOC 封装
```

### 错误边界组件实现

```typescript
// src/components/common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo);

    // 记录错误到日志服务
    this.logError(error, errorInfo);
  }

  private logError(error: Error, errorInfo: ErrorInfo): void {
    // 发送到错误监控服务 (如 Sentry, Bugsnag)
    console.error('ErrorBoundary caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // 生产环境发送到错误追踪服务
    if (__DEV__ === false) {
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
```

### 回退 UI 组件

```typescript
// src/components/common/ErrorFallback.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  error: Error | null;
  onReset: () => void;
}

export const ErrorFallback: React.FC<Props> = ({ error, onReset }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        出错了
      </Text>
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
        {error?.message || '发生了意外错误，请重试'}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="重试"
      >
        <Text style={styles.buttonText}>重试</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
```

### 错误边界应用策略

| 组件层级 | 错误边界位置 | 作用 |
|----------|--------------|------|
| 根层级 | `app/_layout.tsx` | 捕获全局未处理错误 |
| 视图层 | 各视图组件 (DayView, WeekView 等) | 视图特定错误隔离 |
| 表单层 | EventForm, RecurrencePicker | 表单错误隔离，不崩溃整个应用 |

### HOC 封装

```typescript
// src/components/common/withErrorBoundary.tsx
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// 使用示例
// const SafeDayView = withErrorBoundary(DayView, <ViewErrorFallback />);
```

### 错误日志报告机制

1. **开发环境**: 控制台输出完整错误信息和组件堆栈
2. **生产环境**: 发送错误到监控服务 (Sentry/Bugsnag)，包含：
   - 错误消息和堆栈
   - 组件堆栈
   - 设备信息 (平台、版本、型号)
   - 用户操作路径 (可选)

---

## 架构概览

### 目录结构

```
yaya/
├── app/                          # Expo Router 路由
│   ├── _layout.tsx               # 根布局 (主题 Provider)
│   ├── index.tsx                 # 主入口 -> 重定向到日视图
│   ├── (tabs)/                   # 底部标签导航
│   │   ├── _layout.tsx           # 标签布局
│   │   ├── day.tsx               # 日视图
│   │   ├── week.tsx              # 周视图
│   │   ├── month.tsx             # 月视图
│   │   └── events.tsx            # 事件列表
│   └── event/
│       └── [id].tsx              # 事件详情/编辑页
│
├── src/
│   ├── components/               # UI 组件
│   │   ├── common/               # 通用组件
│   │   │   ├── GlassCard.tsx     # 玻璃态卡片
│   │   │   ├── Button.tsx        # 按钮组件
│   │   │   ├── Modal.tsx         # 模态框
│   │   │   └── AnimatedView.tsx  # 动画视图封装
│   │   ├── calendar/             # 日历相关组件
│   │   │   ├── DayView.tsx       # 日视图组件
│   │   │   ├── WeekView.tsx      # 周视图组件
│   │   │   ├── MonthView.tsx     # 月视图组件
│   │   │   ├── EventCard.tsx     # 事件卡片
│   │   │   ├── TimeGrid.tsx      # 时间网格
│   │   │   └── CalendarHeader.tsx # 日历头部
│   │   └── forms/                # 表单组件
│   │       ├── EventForm.tsx     # 事件表单
│   │       └── RecurrencePicker.tsx # 重复规则选择器
│   │
│   ├── domain/                   # 领域逻辑 (纯函数，易测试)
│   │   ├── event.ts              # 事件模型与操作
│   │   ├── recurrence.ts         # 重复规则计算
│   │   ├── lunar.ts              # 农历计算与转换
│   │   ├── date-utils.ts         # 日期工具函数
│   │   └── types.ts              # 类型定义
│   │
│   ├── stores/                   # Zustand 状态管理
│   │   ├── eventStore.ts         # 事件状态
│   │   ├── viewStore.ts          # 视图状态
│   │   └── themeStore.ts         # 主题状态
│   │
│   ├── services/                 # 服务层
│   │   ├── database.ts           # SQLite 数据库操作
│   │   └── storage.ts            # 存储服务封装
│   │
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useEvents.ts          # 事件数据 Hook
│   │   ├── useTheme.ts           # 主题 Hook
│   │   └── useAnimatedTheme.ts   # 主题切换动画
│   │
│   ├── styles/                   # 样式定义
│   │   ├── theme.ts              # 主题配置 (颜色、间距)
│   │   ├── shadows.ts            # 阴影样式
│   │   └── animations.ts         # 动画配置
│   │
│   └── utils/                    # 工具函数
│       ├── platform.ts           # 平台适配
│       └── accessibility.ts      # 无障碍工具
│
├── __tests__/                    # 测试文件
│   ├── domain/                   # 领域逻辑测试
│   ├── services/                 # 服务层测试
│   └── e2e/                      # E2E 测试
│
└── assets/                       # 静态资源
    ├── fonts/                    # 字体文件
    └── images/                   # 图片资源
```

### 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Components                         │
│  (DayView, WeekView, MonthView, EventCard, Forms)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Zustand Stores                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ eventStore  │  │  viewStore  │  │ themeStore  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │  database.ts    │          │   storage.ts    │          │
│  │ (SQLite 操作)   │          │ (持久化配置)    │          │
│  └─────────────────┘          └─────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  event.ts   │  │recurrence.ts│  │ date-utils  │         │
│  │ (事件模型)  │  │(重复计算)   │  │ (日期工具)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 实施阶段

### Phase 1: 基础设施 (Foundation)

**目标**: 建立项目骨架、主题系统、导航结构

| 步骤 | 任务 | 验收标准 |
|------|------|----------|
| 1.1 | 安装依赖 (zustand, expo-sqlite, date-fns, lunar-javascript) | package.json 更新，npm install 成功 |
| 1.2 | 创建目录结构 | 所有目录存在，符合架构设计 |
| 1.3 | 实现主题系统 (亮色/暗色主题配置) | themeStore 可切换主题，颜色变量定义完整 |
| 1.4 | 实现主题切换动画 | useAnimatedTheme Hook 实现平滑过渡 |
| 1.5 | 配置底部标签导航 | 4 个标签页 (日/周/月/事件列表) 可切换 |
| 1.6 | 创建基础 UI 组件 (Button, GlassCard) | 组件可复用，支持主题 |
| 1.7 | 实现农历转换服务 | lunar.ts 支持公历农历互转、节气、节日查询 |

**预计工作量**: 1-2 天

---

### Phase 2: 核心领域 (Core Domain)

**目标**: 实现事件模型、存储层、CRUD 操作

| 步骤 | 任务 | 验收标准 |
|------|------|----------|
| 2.1 | 定义事件类型和重复规则类型 | types.ts 包含完整类型定义 |
| 2.2 | 实现 SQLite 数据库初始化 | database.ts 创建 events 表 |
| 2.3 | 实现事件 CRUD 服务 | 增删改查操作全部可用 |
| 2.4 | 实现重复事件逻辑 | recurrence.ts 支持日/周/月/年重复 |
| 2.5 | 创建 eventStore | Zustand store 管理事件状态 |
| 2.6 | 实现 useEvents Hook | 组件可通过 Hook 访问事件数据 |

**预计工作量**: 2-3 天

---

### Phase 3: 视图实现 (Views)

**目标**: 实现四种日历视图

| 步骤 | 任务 | 验收标准 |
|------|------|----------|
| 3.1 | 实现日视图 (DayView) | 显示当日时间网格和事件 |
| 3.2 | 实现周视图 (WeekView) | 显示 7 天时间网格和事件 |
| 3.3 | 实现月视图 (MonthView) | 显示月份日历和事件指示器 |
| 3.4 | 实现事件列表 (EventsListView) | 按日期分组显示事件列表 |
| 3.5 | 实现事件卡片组件 (EventCard) | 显示事件详情，支持点击编辑 |
| 3.6 | 实现事件表单 (EventForm) | 创建/编辑事件表单完整可用 |
| 3.7 | 实现重复规则选择器 | 可选择日/周/月/年重复 |

**预计工作量**: 4-5 天

---

### Phase 4: 打磨优化 (Polish)

**目标**: 实现动画效果、玻璃态 UI、过渡动画

| 步骤 | 任务 | 验收标准 |
|------|------|----------|
| 4.1 | 实现视图切换过渡动画 | 日/周/月/列表切换流畅 |
| 4.2 | 实现事件操作动画 | 创建/删除/编辑有动画反馈 |
| 4.3 | 实现模态框动画 | 打开/关闭动画流畅 |
| 4.4 | 实现玻璃态效果 | GlassCard 组件有模糊背景 |
| 4.5 | 实现柔和阴影和圆角 | 所有组件符合设计风格 |
| 4.6 | 性能优化 | 60fps 流畅运行 |
| 4.7 | 无障碍适配 | 支持 VoiceOver/TalkBack |

**预计工作量**: 2-3 天

---

## 文件级实施计划

### Phase 1 文件

#### `src/domain/types.ts`

**目的**: 定义核心类型

**关键类型**:
```typescript
// 事件
interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO datetime
  endTime: string;
  color: string;
  recurrenceRule?: RecurrenceRule;
  recurrenceException?: string[];
}

// 重复规则
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
  count?: number;
}

// 视图类型
type ViewType = 'day' | 'week' | 'month' | 'events';

// 主题类型
interface Theme {
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
    // ...
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
}
```

**依赖**: 无

---

#### `src/styles/theme.ts`

**目的**: 定义亮色和暗色主题配置

**关键导出**:
```typescript
export const lightTheme: Theme;
export const darkTheme: Theme;
export const createTheme = (isDark: boolean): Theme;
```

**依赖**: `./types`

---

#### `src/stores/themeStore.ts`

**目的**: 主题状态管理

**关键功能**:
- 当前主题模式 (light/dark/system)
- 切换主题方法
- 持久化到 AsyncStorage

**依赖**: zustand, zustand/middleware

---

#### `src/stores/viewStore.ts`

**目的**: 视图状态管理

**关键功能**:
- 当前视图类型
- 当前选中日期
- 视图切换方法

**依赖**: zustand

---

#### `src/components/common/GlassCard.tsx`

**目的**: 玻璃态效果卡片组件

**关键特性**:
- 模糊背景效果
- 半透明背景
- 柔和阴影
- 圆角

**依赖**: react-native, react-native-reanimated

---

#### `app/(tabs)/_layout.tsx`

**目的**: 底部标签导航布局

**关键功能**:
- 4 个标签页配置
- 标签栏样式
- 标签切换动画

**依赖**: expo-router, @expo/vector-icons

---

### Phase 2 文件

#### `src/services/database.ts`

**目的**: SQLite 数据库操作

**关键功能**:
```typescript
export const initDatabase = async (): Promise<void>;
export const createEvent = async (event: Event): Promise<Event>;
export const updateEvent = async (id: string, updates: Partial<Event>): Promise<Event>;
export const deleteEvent = async (id: string): Promise<void>;
export const getEventsByDateRange = async (start: Date, end: Date): Promise<Event[]>;
export const getEventById = async (id: string): Promise<Event | null>;
```

**依赖**: expo-sqlite

---

#### `src/domain/recurrence.ts`

**目的**: 重复事件计算

**关键功能**:
```typescript
export const expandRecurrence = (
  rule: RecurrenceRule,
  start: Date,
  rangeStart: Date,
  rangeEnd: Date
): Date[];
export const getNextOccurrence = (rule: RecurrenceRule, after: Date): Date | null;
export const isRecurrenceException = (event: Event, date: Date): boolean;
```

**依赖**: date-fns

---

#### `src/stores/eventStore.ts`

**目的**: 事件状态管理

**关键功能**:
- 事件列表缓存
- 当前日期的事件
- CRUD 操作
- 乐观更新

**依赖**: zustand, ../services/database, ../domain/recurrence

---

#### `src/hooks/useEvents.ts`

**目的**: 事件数据 Hook

**关键功能**:
```typescript
export const useEvents = (startDate: Date, endDate: Date) => {
  // 返回日期范围内的事件
  return { events, loading, error, refresh };
};
```

**依赖**: ../stores/eventStore, ../domain/recurrence

---

### Phase 3 文件

#### `src/components/calendar/DayView.tsx`

**目的**: 日视图组件

**关键功能**:
- 24 小时时间网格
- 事件块渲染
- 当前时间指示器
- 点击空白创建事件

**依赖**: react-native, ../hooks/useEvents, ./TimeGrid, ./EventCard

---

#### `src/components/calendar/WeekView.tsx`

**目的**: 周视图组件

**关键功能**:
- 7 天列显示
- 时间网格
- 事件块
- 横向滚动

**依赖**: react-native, react-native-gesture-handler, ../hooks/useEvents

---

#### `src/components/calendar/MonthView.tsx`

**目的**: 月视图组件

**关键功能**:
- 月份日历网格
- 事件指示点
- 周数显示
- 月份切换

**依赖**: react-native, date-fns, ../hooks/useEvents

---

#### `src/components/forms/EventForm.tsx`

**目的**: 事件创建/编辑表单

**关键功能**:
- 标题输入
- 开始/结束时间选择
- 描述输入
- 颜色选择
- 重复规则设置

**依赖**: react-native, ../common/GlassCard, ./RecurrencePicker

---

### Phase 4 文件

#### `src/hooks/useAnimatedTheme.ts`

**目的**: 主题切换动画 Hook

**关键功能**:
- 使用 Reanimated SharedValue
- 颜色插值动画
- 300ms 平滑过渡

**依赖**: react-native-reanimated, ../stores/themeStore

---

#### `src/components/common/AnimatedView.tsx`

**目的**: 动画视图封装组件

**关键功能**:
- 进入/退出动画
- 布局变化动画
- 支持自定义动画配置

**依赖**: react-native-reanimated

---

## 测试策略

### 覆盖率目标

| 层级 | 目标覆盖率 | 理由 |
|------|------------|------|
| **Domain Layer** | >80% | 核心业务逻辑，纯函数易测试 |
| **Data Layer** | >60% | 数据库操作需要 mock，测试成本较高 |
| **UI Layer** | >40% | 组件测试依赖渲染环境，侧重关键交互 |

### 单元测试

| 文件 | 测试重点 | 覆盖率目标 |
|------|----------|------------|
| `domain/recurrence.ts` | 重复规则计算正确性、边界条件 | >90% |
| `domain/date-utils.ts` | 日期操作边界条件、时区转换 | >85% |
| `domain/event.ts` | 事件验证逻辑、数据完整性 | >80% |
| `services/database.ts` | CRUD 操作正确性、迁移流程 | >70% |
| `services/migrations/*.ts` | 迁移脚本、数据保护 | >80% |

**工具**: Jest + React Native Testing Library

### 集成测试

| 场景 | 测试重点 |
|------|----------|
| 事件创建流程 | 表单提交 -> 数据库存储 -> UI 更新 |
| 重复事件展开 | 数据库读取 -> 展开计算 -> UI 渲染 |
| 主题切换 | 状态变更 -> 持久化 -> 所有组件更新 |

### E2E 测试

| 场景 | 步骤 |
|------|------|
| 创建事件 | 点击日期 -> 填写表单 -> 保存 -> 验证显示 |
| 编辑事件 | 点击事件 -> 修改 -> 保存 -> 验证更新 |
| 删除事件 | 点击事件 -> 删除 -> 确认 -> 验证消失 |
| 视图切换 | 切换到周视图 -> 验证数据正确 |
| 主题切换 | 切换暗色主题 -> 验证颜色变化 |

**工具**: Detox (可选，适合生产级应用)

---

## 依赖清单

### 生产依赖

```json
{
  "zustand": "^4.5.0",
  "expo-sqlite": "~15.0.0",
  "date-fns": "^3.6.0",
  "date-fns-tz": "^3.0.0",
  "rrule": "^2.8.0",
  "uuid": "^9.0.0",
  "dexie": "^4.0.0",
  "lunar-javascript": "^1.6.0"
}
```

**新增依赖说明**:
- `date-fns-tz`: 时区处理，与 date-fns 配合使用
- `rrule`: RFC 5545 标准重复规则库
- `dexie`: Web 平台 IndexedDB 封装 (expo-sqlite 替代)
- `lunar-javascript`: 农历计算库，支持公历农历互转、节气、传统节日

### 开发依赖

```json
{
  "@testing-library/react-native": "^12.4.0",
  "jest": "^29.7.0",
  "jest-expo": "~54.0.0",
  "@types/rrule": "^2.2.0"
}
```

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Reanimated 在 Web 性能有限 | Web 动画帧率 30-45fps | 高 | 双路径动画实现：原生用 Reanimated，Web 用 CSS 动画 |
| expo-sqlite 不支持 Web | Web 数据持久化失败 | 确定 | Web 平台使用 Dexie.js (IndexedDB) 替代 |
| SQLite 迁移复杂 | 数据库升级困难 | 中 | Schema 版本管理 + 迁移脚本 + 备份机制 |
| 重复事件性能 | 大量展开计算卡顿 | 中 | 虚拟化列表，惰性计算，仅展开可见范围 |
| 玻璃态效果性能 | Android 低端机卡顿 | 中 | 平台检测，低端设备降级为纯色背景 |
| 时区边界情况 | 夏令时、跨时区显示错误 | 中 | 使用 IANA 时区标识符，date-fns-tz 自动处理 |
| 闰年/月末重复 | 2/29、月末日期处理异常 | 低 | rrule 库处理 + 用户选择提示 |

---

## ADR (Architecture Decision Record)

### ADR-001: 时区处理库选择

**决策**: 使用 date-fns-tz

**驱动因素**:
1. 项目已采用 date-fns，保持生态一致性
2. 包体积小 (~2KB)，无额外依赖
3. TypeScript 支持完善

**备选方案**:
- luxon: 功能更全但包体积大 (~20KB)
- dayjs + timezone 插件: 极小但需要额外配置

**选择理由**: 生态一致性优先，功能满足需求

**后果**:
- 正面: 代码风格统一，学习成本低
- 负面: 复杂时区场景可能需要额外处理

**后续事项**: 集成 IANA 时区数据库，处理用户时区偏好设置

---

### ADR-002: 重复事件算法选择

**决策**: 使用 rrule 库

**驱动因素**:
1. RFC 5545 标准实现，与主流日历兼容
2. 成熟稳定，广泛使用
3. 支持复杂的重复规则和异常处理

**备选方案**:
- 自定义实现: 完全可控但开发成本高，边界情况多
- date-fns eachDayOfInterval: 轻量但仅支持简单间隔

**选择理由**: 标准兼容性优先，减少边界情况处理工作量

**后果**:
- 正面: 与 Google Calendar、Apple Calendar 格式兼容
- 负面: 包体积增加 ~15KB

**后续事项**: 实现 EXDATE/RDATE 支持，处理修改/删除单个重复实例

---

### ADR-003: Web 数据持久化方案

**决策**: 使用 Dexie.js (IndexedDB) 作为 Web 平台替代方案

**驱动因素**:
1. expo-sqlite 不支持 Web 平台
2. 需要统一的数据访问接口
3. IndexedDB 支持复杂查询

**备选方案**:
- AsyncStorage: 简单但无查询能力
- localStorage: 同步 API，可能阻塞主线程
- 直接使用 IndexedDB API: 复杂，缺少 Promise 支持

**选择理由**: Dexie 提供 Promise API，与 SQLite 接口相似，易于适配

**后果**:
- 正面: Web 平台数据持久化可用
- 负面: 需要维护两套适配器实现

**后续事项**: 实现 DatabaseAdapter 抽象层，确保 API 一致性

---

### ADR-004: Web 动画策略

**决策**: 双路径动画实现 (原生 Reanimated + Web CSS 动画)

**驱动因素**:
1. Reanimated 在 Web 平台性能有限 (30-45fps)
2. 用户期望流畅的动画体验
3. 需要跨平台代码共享

**备选方案**:
- 统一使用 Animated API: 性能不如 Reanimated
- Web 禁用动画: 体验降级明显
- 使用 CSS-in-JS 动画库: 增加 bundle 体积

**选择理由**: 针对平台特性优化，保持最佳体验

**后果**:
- 正面: 各平台动画流畅度最优
- 负面: 需要维护两套动画实现

**后续事项**: 抽象动画配置，统一管理动画参数

---

## 成功标准

### 功能验收

- [ ] 用户可以创建、编辑、删除事件
- [ ] 用户可以设置重复事件（每日/每周/每月/每年）
- [ ] 用户可以在日视图、周视图、月视图、事件列表之间切换
- [ ] 用户可以切换暗色/亮色主题
- [ ] 月视图显示农历日期（初一显示月份，其他显示日期）
- [ ] 显示二十四节气（如：立春、雨水等）
- [ ] 显示中国传统节日（春节、中秋、端午、清明等）
- [ ] 应用可在 iOS、Android、Web 上运行

### 性能验收 (量化指标)

| 验收项 | 量化标准 | 测量方法 |
|--------|----------|----------|
| 视图切换动画 | 帧率 ≥ 55fps | Flipper Performance Monitor |
| 视图过渡时长 | 250-350ms | React DevTools Profiler |
| 主题切换动画 | 平滑过渡，无闪烁 | 视觉检查 + 主题切换延迟 < 100ms |
| 事件操作反馈 | 动画完成 ≤ 200ms | 计时器测量 |
| 弹窗/模态框动画 | 打开/关闭 ≤ 300ms | React DevTools Profiler |

### UI/UX 验收 (量化指标)

| 验收项 | 量化标准 |
|--------|----------|
| 圆角半径 | 统一使用 8px / 12px / 16px 三档 |
| 阴影效果 | 模糊半径 8-16px，偏移 2-4px |
| 玻璃态效果 | 背景模糊 10-20px，透明度 70-90% |
| 内边距 | 统一使用 4 的倍数 (4px, 8px, 12px, 16px, 24px) |

### 测试验收

| 验收项 | 标准 |
|--------|------|
| Domain Layer 覆盖率 | >80% |
| Data Layer 覆盖率 | >60% |
| UI Layer 覆盖率 | >40% |
| E2E 关键路径 | 全部通过 |
| 无障碍检查 | VoiceOver/TalkBack 支持 |
