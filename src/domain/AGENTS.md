<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# domain

## Purpose
领域逻辑层，包含核心业务逻辑：农历计算、重复事件处理和类型定义。

## Key Files
| File | Description |
|------|-------------|
| `types.ts` | 核心类型定义（Event、RecurrenceRule、Theme、LunarDate 等） |
| `lunar.ts` | 农历计算服务，使用 lunar-javascript 库 |
| `recurrence.ts` | 重复事件规则处理，展开重复事件实例 |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 类型定义是整个应用的基础
- 农历服务提供节气、节日、干支等信息
- 重复规则支持 daily/weekly/monthly/yearly

### Testing Requirements
- 测试农历转换正确性
- 测试重复事件展开逻辑
- 测试边界条件（闰月、跨年等）

### Common Patterns
- 纯函数设计，无副作用
- 返回类型化的数据结构
- 使用 lunar-javascript 作为底层计算库

## Dependencies

### Internal
无内部依赖。

### External
- `lunar-javascript` - 农历计算库
- `date-fns` - 日期处理

<!-- MANUAL: -->
