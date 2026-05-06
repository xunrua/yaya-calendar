<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# stores

## Purpose
Zustand 状态管理目录，管理应用全局状态：事件数据、主题设置、视图状态。

## Key Files
| File | Description |
|------|-------------|
| `eventStore.ts` | 事件状态管理，包含 CRUD 操作和视图状态 |
| `themeStore.tsx` | 主题状态管理，支持 light/dark/system 模式 |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 使用 Zustand 的 create 函数创建 store
- 导出 `useXxxStore` hook 供组件使用
- 主题 store 包含 ThemeProvider 组件

### Testing Requirements
- 测试状态更新逻辑
- 测试持久化功能
- 测试主题切换

### Common Patterns
- Store 分离：数据状态 vs UI 状态
- 使用 persist 中间件持久化设置
- 提供 selector hooks 如 `useEvents()`、`useTheme()`

## Dependencies

### Internal
- `../domain/types` - 类型定义
- `../services/database` - 数据库操作
- `../styles/theme` - 主题配置

### External
- `zustand` - 状态管理
- `@react-native-async-storage/async-storage` - 持久化存储

<!-- MANUAL: -->
