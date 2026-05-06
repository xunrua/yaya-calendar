<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# services

## Purpose
数据服务层，提供数据库操作接口。支持 Web (IndexedDB) 和 Native (SQLite) 两种实现。

## Key Files
| File | Description |
|------|-------------|
| `database.ts` | Web 端数据库实现，使用 Dexie (IndexedDB) |
| `database.native.ts` | Native 端数据库实现，使用 expo-sqlite |

## Subdirectories
无子目录。

## For AI Agents

### Working In This Directory
- 两个平台文件通过 `.native.ts` 后缀自动区分
- 统一的 API 接口：initDatabase、createEvent、updateEvent、deleteEvent 等
- 支持数据导入/导出功能

### Testing Requirements
- 测试 CRUD 操作
- 测试数据持久化
- 测试导入/导出功能

### Common Patterns
- 使用 uuid 生成事件 ID
- 自动管理 createdAt/updatedAt 时间戳
- 异步 API，返回 Promise

## Dependencies

### Internal
- `../domain/types` - Event 类型定义

### External
- `dexie` - IndexedDB 封装 (Web)
- `expo-sqlite` - SQLite 数据库 (Native)
- `uuid` - UUID 生成

<!-- MANUAL: -->
