<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# (main)

## Purpose
主页面路由组，包含带底部导航栏的主界面。括号表示路由组，不会出现在 URL 中。

## Key Files
| File | Description |
|------|-------------|
| `index.tsx` | 主页面，包含日历视图和待办列表切换 |
| `_layout.tsx` | 路由组布局（当前为空） |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 使用 FloatingNavBar 进行视图切换
- 支持 calendar/todo/week/schedule 四种视图
- 视图状态使用 useState 管理

### Testing Requirements
- 测试视图切换功能
- 测试菜单交互

### Common Patterns
- 使用条件渲染切换视图
- 浮动导航栏固定在底部

## Dependencies

### Internal
- `../../src/stores/themeStore` - 主题样式
- `../../src/components/common/FloatingNavBar` - 导航栏
- `../../src/components/common/FloatingMenu` - 菜单
- `../../src/components/calendar/*` - 日历视图组件

### External
- `react-native` - UI 组件

<!-- MANUAL: -->
