<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# YAYA Calendar App

## Purpose
YAYA 是一款支持农历显示的跨平台日历应用，基于 Expo 构建，支持 iOS、Android 和 Web。核心功能包括事件管理、重复事件、农历/节气/节日显示。

## Key Files
| File | Description |
|------|-------------|
| `package.json` | 项目依赖和脚本配置 |
| `app.json` | Expo 应用配置（名称、图标、插件等） |
| `tsconfig.json` | TypeScript 配置，启用严格模式 |
| `metro.config.js` | Metro 打包器配置 |
| `eslint.config.js` | ESLint 配置 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `app/` | 路由和页面组件（expo-router 文件路由） |
| `src/` | 应用源代码（组件、服务、状态管理） |
| `assets/` | 静态资源（字体、图片） |
| `__tests__/` | 测试文件 |
| `.agents/` | AI 代理技能配置 |
| `.omc/` | OMC 状态和配置 |

## For AI Agents

### Working In This Directory
- 使用 `npm start` 启动开发服务器
- 使用 `npx tsc --noEmit` 进行类型检查
- 使用 `npm run lint` 运行 ESLint
- 路径别名 `@/*` 映射到项目根目录

### Testing Requirements
- 测试文件位于 `__tests__/` 目录
- 使用 Jest 测试框架

### Common Patterns
- 使用 Zustand 进行状态管理
- 使用 expo-router 进行文件系统路由
- 数据库：Web 使用 Dexie (IndexedDB)，Native 使用 expo-sqlite
- 主题系统支持 light/dark/system 三种模式

## Dependencies

### External
- **expo** (~54.0.33) - 跨平台框架
- **expo-router** (~6.0.23) - 文件系统路由
- **react-native** (0.81.5) - 移动端框架
- **zustand** (^5.0.13) - 状态管理
- **dexie** (^4.4.2) - IndexedDB 封装
- **date-fns** (^4.1.0) - 日期处理
- **lunar-javascript** (^1.7.7) - 农历计算
- **rrule** (^2.8.1) - 重复规则处理
- **react-native-reanimated** (~4.1.1) - 动画库

<!-- MANUAL: Custom project notes can be added below -->
