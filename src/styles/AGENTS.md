<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# styles

## Purpose
样式和主题定义目录，包含颜色配置、间距、圆角等设计令牌。

## Key Files
| File | Description |
|------|-------------|
| `theme.ts` | 主题配置，定义 light/dark 主题颜色和设计令牌 |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 颜色使用语义化命名（primary、surface、text 等）
- 日历特定颜色：todayBackground、lunarText、holidayText 等
- 间距和圆角使用统一的设计令牌

### Testing Requirements
- 验证主题切换正确性
- 验证颜色对比度符合可访问性标准

### Common Patterns
- 使用 `createTheme(isDark)` 函数创建主题
- 导出 `lightTheme` 和 `darkTheme` 常量
- 提供颜色工具函数如 `getEventColor()`

## Dependencies

### Internal
- `../domain/types` - Theme 类型定义

### External
无外部依赖。

<!-- MANUAL: -->
