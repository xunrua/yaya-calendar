<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# calendar

## Purpose
日历视图组件，提供多种日历显示模式：月视图、周视图、日视图和日程视图。

## Key Files
| File | Description |
|------|-------------|
| `MonthView.tsx` | 月视图组件，显示完整月历网格，包含农历信息 |
| `WeekView.tsx` | 周视图组件，显示一周的详细日程 |
| `DayView.tsx` | 日视图组件，显示单日详细时间线 |
| `ScheduleView.tsx` | 日程视图，列表形式显示事件 |
| `EventList.tsx` | 事件列表组件，待办事项视图 |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 使用 `useViewStore()` 获取当前视图状态
- 使用 `useEventStore()` 获取事件数据
- 使用 `getLunarInfo()` 显示农历信息

### Testing Requirements
- 测试视图切换功能
- 测试事件显示正确性
- 测试日期导航功能

### Common Patterns
- 使用 date-fns 处理日期计算
- 事件指示器使用彩色圆点
- 今日日期使用特殊背景高亮

## Dependencies

### Internal
- `../../stores/themeStore` - 主题样式
- `../../stores/eventStore` - 事件和视图状态
- `../../domain/lunar` - 农历信息获取

### External
- `date-fns` - 日期处理
- `react-native` - UI 组件

<!-- MANUAL: -->
