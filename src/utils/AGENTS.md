<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-11 | Updated: 2026-05-11 -->

# utils

## Purpose
工具函数目录，提供日期计算、工作日安排等通用工具函数。

## Key Files
| File | Description |
|------|-------------|
| `calendar.ts` | 日历工具函数，日期范围计算、月份导航等 |
| `workSchedule.ts` | 工作日安排工具，工作时间配置 |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 纯函数设计，无副作用
- 使用 date-fns 处理日期计算
- 返回类型化的数据结构

### Testing Requirements
- 测试日期计算正确性
- 测试边界条件（跨月、跨年等）

### Common Patterns
- 导出命名函数
- 使用 date-fns 作为底层计算库

## Dependencies

### Internal
无内部依赖。

### External
- `date-fns` - 日期处理

<!-- MANUAL: -->
