<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# forms

## Purpose
表单组件目录，包含事件创建和编辑表单。

## Key Files
| File | Description |
|------|-------------|
| `EventForm.tsx` | 事件表单组件，支持创建和编辑事件 |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 表单验证使用受控组件模式
- 支持重复事件规则设置
- 支持时区选择

### Testing Requirements
- 测试表单验证逻辑
- 测试提交和取消操作
- 测试重复规则配置

### Common Patterns
- 使用 useState 管理表单状态
- 日期时间选择器集成
- 颜色选择器集成

## Dependencies

### Internal
- `../../stores/eventStore` - 事件操作
- `../../stores/themeStore` - 主题样式
- `../../domain/types` - 类型定义

### External
- `react-native` - UI 组件
- `date-fns` - 日期处理

<!-- MANUAL: -->
