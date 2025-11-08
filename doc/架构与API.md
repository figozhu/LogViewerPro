# 架构与 API 说明

## 1. 总体架构
```
Renderer (Vue + Pinia)
        │ preload (window.logViewerApi)
        ▼
Main (Electron) ── WorkerManager ──► Worker Threads (LogIndexer/SchemaBuilder)
```
- **Renderer**：负责模板管理、日志查询、偏好设置与系统日志展示，所有原生 API 通过 `preload.ts` 暴露的 `window.logViewerApi` 调用。
- **Main**：处理窗口生命周期、菜单、IPC handler、索引缓存、偏好与系统日志收集，并将重型任务派发给 Worker。
- **Worker**：负责大文件解析、SQLite Schema 构建与 FTS5 写入。

## 2. 核心模块
| 模块 | 功能 | 主要文件 |
| ---- | ---- | -------- |
| TemplateStore | 模板 CRUD、Regex 测试、最近文件 | `src/renderer/stores/templateStore.ts` |
| LogsStore | Schema、查询、过滤器、虚拟滚动 | `src/renderer/stores/logsStore.ts` |
| PreferenceStore | 主题、默认查询条数、窗口记忆 | `src/renderer/stores/preferenceStore.ts` / `src/main/services/preferences-store.ts` |
| SystemLogStore | 读取 `app.log` 并在前端展示 | `src/renderer/stores/systemLogStore.ts` |
| QueryBuilder | 构建 SQL（列白名单/分页/排序） | `src/main/services/query-builder.ts` |
| IndexCacheManager | 缓存 key、db/meta 管理、清理 | `src/main/services/index-cache-manager.ts` |
| LogIndexer / SchemaBuilder | Worker 端解析、建表、写入 | `src/worker/db/*.ts` |

## 3. IPC 通道
| Channel | 方向 | 说明 |
| ------- | ---- | ---- |
| `templates:getAll/save/delete` | Renderer ⇄ Main | 模板 CRUD |
| `recentItems:get/save` | Renderer ⇄ Main | 最近文件列表 |
| `dialog:openFile` | Renderer → Main | 系统文件选择 |
| `index:start/cancel` | Renderer → Main → Worker | 启动/取消索引 |
| `index:progress/complete/error` | Worker → Main → Renderer | 索引进度广播 |
| `schema:get` / `query:run` / `filters:getOptions` | Renderer → Main | SQLite 查询与过滤器 |
| `cache:info/clearAll/openDir` | Renderer ⇄ Main | 索引缓存操作 |
| `logs:getRecent` | Renderer → Main | 读取系统日志 |
| `preferences:get/update` | Renderer ⇄ Main | 偏好同步 |

所有 IPC 定义在 `src/shared/ipc-channels.ts`，通过 `src/main/preload.ts` 暴露，并在 `src/types/global.d.ts` 中声明类型以获得 TS 提示。

## 4. 数据流
1. **打开日志**：Renderer 选择模板 → Main 校验、启动 Worker → Worker 写入 SQLite → Main 更新缓存并广播 → Renderer 收到 `index:complete` 后加载 Schema/数据并渲染。
2. **查询刷新**：LogsStore 根据当前条件构造 QueryRequest → Main 使用 QueryBuilder 拼接 SQL → 返回 rows/total → Renderer 使用虚拟滚动展示。
3. **偏好与系统日志**：Renderer 面板调用 `preferences:*` 或 `logs:getRecent` → Main 从 electron-store 或日志文件读取后返回 → Renderer 更新主题、limit、窗口状态或日志列表。

## 5. 扩展指引
- **新增 IPC**：同步修改 `shared/ipc-channels.ts`、`preload.ts`、`global.d.ts`，避免魔法字符串。
- **新增 Store/模块**：仿照现有架构编写 Pinia Store，并在 `tests/*.test.ts` 使用 Vitest 覆盖。
- **Worker 扩展**：通过 `WorkerManager` 注册消息类型，复用 `INDEX_*` 协议，确保错误能回传到 Main。
- **日志/偏好扩展**：可在 `preferences-store` 增加字段，并在 Renderer 面板中即时反映；系统日志如需新增源，只需在主进程写入 `app.log`。
