<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# src

## Purpose
应用核心源代码目录，包含组件、服务、状态管理、领域逻辑和类型定义。

## Key Files
无直接文件，所有代码组织在子目录中。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `components/` | UI 组件（日历视图、通用组件、表单） |
| `domain/` | 领域逻辑（农历计算、重复规则、类型定义） |
| `services/` | 数据服务（数据库操作） |
| `stores/` | Zustand 状态管理（事件、主题、视图状态） |
| `styles/` | 主题和样式定义 |
| `types/` | TypeScript 类型声明 |
| `hooks/` | 自定义 React Hooks（当前为空） |
| `utils/` | 工具函数（当前为空） |

## For AI Agents

### Working In This Directory
- 遵循功能模块化组织
- 状态管理使用 Zustand
- 数据库操作通过 `services/database.ts` 统一接口

### Testing Requirements
- 领域逻辑应有单元测试
- 组件测试使用 React Testing Library

### Common Patterns
- Store 文件导出 `useXxxStore` hook
- 组件使用 `useTheme()` 获取主题
- 数据库操作返回 Promise

## Dependencies

### External
- `zustand` - 状态管理
- `date-fns` - 日期处理
- `lunar-javascript` - 农历计算

<!-- MANUAL: -->
