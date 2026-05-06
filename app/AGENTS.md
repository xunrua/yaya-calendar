<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# app

## Purpose
expo-router 文件系统路由目录。每个文件对应一个路由，目录结构决定 URL 路径。

## Key Files
| File | Description |
|------|-------------|
| `_layout.tsx` | 根布局组件，包含 ThemeProvider 和 SafeAreaProvider |
| `index.tsx` | 入口页面，重定向到 (main) 路由组 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `(main)/` | 主页面路由组（带底部导航栏的页面） |
| `event/` | 事件详情页面路由 |

## For AI Agents

### Working In This Directory
- 使用 expo-router 的 `Stack` 和 `Tabs` 组件进行导航
- 文件名决定路由路径（如 `event/[id].tsx` 为动态路由）
- 括号包裹的目录名（如 `(main)`）不会出现在 URL 中

### Testing Requirements
- 测试导航流程是否正常
- 验证动态路由参数传递

### Common Patterns
- `_layout.tsx` 定义路由组的共享布局
- 使用 `useRouter()` 和 `useLocalSearchParams()` 进行导航和参数获取

## Dependencies

### Internal
- `src/stores/themeStore` - 主题提供者
- `src/stores/eventStore` - 事件状态管理

### External
- `expo-router` - 路由系统
- `react-native-safe-area-context` - 安全区域处理

<!-- MANUAL: -->
