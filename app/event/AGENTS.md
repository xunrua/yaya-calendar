<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# event

## Purpose
事件详情页面路由目录，包含动态路由页面。

## Key Files
| File | Description |
|------|-------------|
| `[id].tsx` | 事件详情页面，使用动态路由参数 id |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 使用 `useLocalSearchParams()` 获取路由参数
- 页面显示事件的详细信息
- 支持编辑和删除操作

### Testing Requirements
- 测试动态路由参数传递
- 测试事件加载和显示
- 测试编辑/删除操作

### Common Patterns
- 使用 `useEventStore().getEventById()` 获取事件
- 使用 `useRouter().back()` 返回上一页

## Dependencies

### Internal
- `../../src/stores/eventStore` - 事件状态
- `../../src/stores/themeStore` - 主题样式

### External
- `expo-router` - 路由和参数
- `react-native` - UI 组件

<!-- MANUAL: -->
