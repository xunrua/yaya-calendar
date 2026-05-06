<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# images

## Purpose
图片资源目录，包含应用图标、启动画面等图片文件。

## Key Files
| File | Description |
|------|-------------|
| `icon.png` | 应用图标 |
| `splash-icon.png` | 启动画面图标 |
| `favicon.png` | Web 网站图标 |
| `android-icon-*.png` | Android 自适应图标各部分 |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 图片通过 `@/assets/images/` 路径引用
- 支持多分辨率图片（@2x, @3x 后缀）

### Testing Requirements
- 验证图片资源存在
- 验证图片加载正确

### Common Patterns
- 使用 expo-image 的 Image 组件
- 支持缓存和占位符

## Dependencies

### External
- `expo-image` - 图片组件

<!-- MANUAL: -->
