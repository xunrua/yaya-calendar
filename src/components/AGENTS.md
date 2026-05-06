<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# components

## Purpose
React 组件目录，按功能分类组织：日历视图、通用 UI 组件和表单组件。

## Key Files
无直接文件，所有组件组织在子目录中。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `calendar/` | 日历视图组件（月视图、周视图、日视图、事件列表） |
| `common/` | 通用 UI 组件（按钮、导航栏、模态框等） |
| `forms/` | 表单组件（事件表单） |

## For AI Agents

### Working In This Directory
- 每个组件一个文件
- 使用 `useTheme()` hook 获取主题样式
- 组件样式使用 `StyleSheet.create()` 定义

### Testing Requirements
- 组件测试使用 React Testing Library
- 测试文件放在 `__tests__/` 目录

### Common Patterns
- Props 接口定义在组件文件顶部
- 使用 `React.FC<Props>` 类型注解
- 导出命名组件和默认组件

## Dependencies

### Internal
- `../../stores/themeStore` - 主题 hook
- `../../stores/eventStore` - 事件状态
- `../../domain/lunar` - 农历计算

### External
- `react-native` - 核心组件
- `react-native-reanimated` - 动画
- `expo-blur` - 模糊效果

<!-- MANUAL: -->
