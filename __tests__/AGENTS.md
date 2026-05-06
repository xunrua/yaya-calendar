<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# __tests__

## Purpose
测试文件目录，包含单元测试、集成测试和端到端测试。

## Key Files
无直接文件，所有测试组织在子目录中。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `domain/` | 领域逻辑测试（当前为空） |
| `e2e/` | 端到端测试（当前为空） |
| `services/` | 服务层测试（当前为空） |

## For AI Agents

### Working In This Directory
- 测试框架：Jest
- 测试文件命名：`*.test.ts` 或 `*.spec.ts`

### Testing Requirements
- 运行 `npm test` 执行测试
- 新功能应添加对应测试

### Common Patterns
- 测试文件与源文件目录结构对应

## Dependencies

### External
- `jest` - 测试框架（通过 Expo 预配置）

<!-- MANUAL: -->
