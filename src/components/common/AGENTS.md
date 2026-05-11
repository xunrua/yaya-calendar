<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-11 | Updated: 2026-05-11 -->

# common

## Purpose
通用 UI 组件，提供可复用的基础组件如按钮、导航栏、模态框、分段控制器等。

## Key Files
| File | Description |
|------|-------------|
| `Button.tsx` | 按钮组件，支持多种样式变体 |
| `FloatingNavBar.tsx` | 浮动导航栏，底部标签切换和操作按钮 |
| `FloatingMenu.tsx` | 浮动菜单，提供视图切换和设置选项 |
| `Modal.tsx` | 模态框组件，支持动画显示/隐藏 |
| `GlassCard.tsx` | 玻璃态卡片组件，毛玻璃背景效果 |
| `SegmentedControl.tsx` | 分段控制器，支持滑动指示器动画 |
| `CalendarHeader.tsx` | 日历头部组件，显示月份和导航按钮 |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 组件支持主题适配（light/dark）
- 使用 react-native-reanimated 实现动画
- 浮动组件使用 absolute 定位

### Testing Requirements
- 测试交互响应
- 测试动画效果
- 测试主题切换

### Common Patterns
- 使用 BlurView 实现毛玻璃效果
- 使用 SafeAreaInsets 处理安全区域
- Web 平台使用 CSS backdrop-filter

## Dependencies

### Internal
- `../../stores/themeStore` - 主题样式

### External
- `expo-blur` - 模糊效果
- `react-native-reanimated` - 动画
- `react-native-safe-area-context` - 安全区域
- `@expo/vector-icons` - 图标

<!-- MANUAL: -->
