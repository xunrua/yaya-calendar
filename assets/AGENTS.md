<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# assets

## Purpose
静态资源目录，包含字体和图片文件。

## Key Files
无直接文件，所有资源组织在子目录中。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `fonts/` | 自定义字体文件 |
| `images/` | 图片资源（图标、启动画面等） |

## For AI Agents

### Working In This Directory
- 图片资源通过 `expo-image` 加载
- 字体通过 `expo-font` 加载

### Testing Requirements
- 验证资源文件存在且可加载

### Common Patterns
- 使用 `@/assets/` 路径别名引用资源

## Dependencies

### External
- `expo-font` - 字体加载
- `expo-image` - 图片组件

<!-- MANUAL: -->
