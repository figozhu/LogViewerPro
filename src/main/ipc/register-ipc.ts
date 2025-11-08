import { BrowserWindow, dialog, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { SaveTemplatePayload } from '@shared/models/log-template';
import type {
  IndexStartRequest,
  IndexStartResponse,
  IndexWorkerCacheInfo,
  IndexWorkerTemplate
} from '@shared/models/indexing';
import { TemplateStore } from '../services/template-store';
import type { WorkerManager } from '../worker-manager';
import type { MainToWorkerMessage } from '@shared/ipc-worker';
import { RecentItemsStore } from '../services/recent-items-store';
import { IndexCacheManager, type CacheInfo } from '../services/index-cache-manager';
import { QueryBuilder } from '../services/query-builder';
import type { QueryRequest, QueryResponse, SchemaInfo } from '@shared/models/query';

interface RegisterIpcOptions {
  getMainWindow: () => BrowserWindow | null;
  workerManager: WorkerManager;
  templateStore?: TemplateStore;
  recentItemsStore?: RecentItemsStore;
  cacheManager?: IndexCacheManager;
}

/**
 * 注册所有 Renderer -> Main 的 IPC 通道。
 */
export function registerIpcHandlers(options: RegisterIpcOptions): void {
  const store = options.templateStore ?? new TemplateStore();
  const recentStore = options.recentItemsStore ?? new RecentItemsStore();
  const cacheManager = options.cacheManager ?? new IndexCacheManager();
  const inFlightJobs = new Map<string, { cacheInfo: CacheInfo }>();
  const knownCaches = new Map<string, CacheInfo>();

  const getWindowOrThrow = (): BrowserWindow => {
    const window = options.getMainWindow();
    if (!window) {
      throw new Error('主窗口尚未就绪');
    }
    return window;
  };

  const getCacheOrThrow = (filePath: string): CacheInfo => {
    const cache = knownCaches.get(filePath);
    if (!cache) {
      throw new Error('该文件尚未建立索引，请先执行索引操作');
    }
    return cache;
  };

  ipcMain.handle(IPC_CHANNELS.READY, () => {
    return {
      timestamp: Date.now()
    };
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATES_GET_ALL, () => {
    return store.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATES_SAVE, (_event, payload: SaveTemplatePayload) => {
    return store.save(payload);
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATES_DELETE, (_event, templateId: string) => {
    store.delete(templateId);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.RECENT_ITEMS_GET, () => {
    return recentStore.getAll();
  });

  ipcMain.handle(
    IPC_CHANNELS.RECENT_ITEMS_SAVE,
    (_event, payload: { filePath: string; templateId: string; templateName: string }) => {
      recentStore.save(payload.filePath, payload.templateId, payload.templateName);
      return recentStore.getAll();
    }
  );

  ipcMain.handle(IPC_CHANNELS.CACHE_INFO_GET, () => {
    return cacheManager.getSummary();
  });

  ipcMain.handle(IPC_CHANNELS.CACHE_CLEAR_ALL, () => {
    cacheManager.clearAll();
    return cacheManager.getSummary();
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    const window = getWindowOrThrow();
    const result = await dialog.showOpenDialog(window, {
      title: '选择日志文件',
      properties: ['openFile'],
      filters: [
        { name: '日志文件', extensions: ['log', 'txt'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.FILE_VALIDATE, async (_event, filePath: string) => {
    const fs = await import('node:fs/promises');
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('请选择有效的日志文件路径');
    }
    return {
      filePath,
      size: stats.size,
      modifiedAt: stats.mtimeMs
    };
  });

  options.workerManager.onMessage((message) => {
    if (message.type === IPC_CHANNELS.INDEX_COMPLETE) {
      const context = inFlightJobs.get(message.payload.jobId);
      if (context && !message.payload.cacheUsed) {
        cacheManager.writeMeta(context.cacheInfo);
        cacheManager.writeStats(context.cacheInfo, {
          inserted: message.payload.inserted,
          skipped: message.payload.skipped
        });
        knownCaches.set(context.cacheInfo.filePath, context.cacheInfo);
      }
      inFlightJobs.delete(message.payload.jobId);
    } else if (message.type === IPC_CHANNELS.INDEX_ERROR && message.payload.jobId) {
      inFlightJobs.delete(message.payload.jobId);
    }
  });

  ipcMain.handle(IPC_CHANNELS.INDEX_START, async (_event, payload: IndexStartRequest) => {
    const template = store.getById(payload.templateId);
    if (!template) {
      throw new Error('指定模板不存在，请刷新后重试');
    }
    const cacheInfo = await cacheManager.resolve(payload.filePath, template);
    knownCaches.set(payload.filePath, cacheInfo);
    const cacheValid = await cacheManager.isCacheValid(cacheInfo);

    const jobId = randomUUID();
    if (cacheValid) {
      const window = options.getMainWindow();
      window?.webContents.send(IPC_CHANNELS.INDEX_COMPLETE, {
        jobId,
        cacheUsed: true
      });
      return { jobId, cacheUsed: true } satisfies IndexStartResponse;
    }

    const workerTemplate: IndexWorkerTemplate = {
      id: template.id,
      name: template.name,
      regex: template.regex,
      timestampField: template.timestampField,
      ftsField: template.ftsField
    };

    const workerCacheInfo: IndexWorkerCacheInfo = {
      cacheKey: cacheInfo.cacheKey,
      dbPath: cacheInfo.dbPath,
      metaPath: cacheInfo.metaPath,
      sourceMtime: cacheInfo.fileMtime,
      sourceSize: cacheInfo.fileSize
    };

    const message: MainToWorkerMessage = {
      type: IPC_CHANNELS.INDEX_START,
      payload: {
        jobId,
        filePath: payload.filePath,
        template: workerTemplate,
        cacheInfo: workerCacheInfo
      }
    };

    inFlightJobs.set(jobId, { cacheInfo });
    options.workerManager.sendCommand(message);

    const response: IndexStartResponse = { jobId, cacheUsed: false };
    return response;
  });

  ipcMain.handle(IPC_CHANNELS.INDEX_CANCEL, (_event, jobId: string) => {
    if (inFlightJobs.has(jobId)) {
      options.workerManager.sendCommand({
        type: IPC_CHANNELS.INDEX_CANCEL,
        payload: { jobId }
      });
      inFlightJobs.delete(jobId);
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SCHEMA_GET, () => {
    return [];
  });

  ipcMain.handle(IPC_CHANNELS.SCHEMA_GET, (_event, filePath: string): SchemaInfo => {
    const cache = getCacheOrThrow(filePath);
    const db = new Database(cache.dbPath, { readonly: true });
    try {
      const columnsRaw = db.prepare('PRAGMA table_info(logs);').all() as Array<{
        name: string;
        type: string;
        notnull: number;
      }>;
      const columns = columnsRaw.map((col) => ({
        name: col.name,
        type: col.type ?? 'TEXT',
        notnull: Boolean(col.notnull)
      }));
      const metaRows = db.prepare('SELECT key, value FROM meta;').all() as Array<{
        key: string;
        value: string;
      }>;
      const meta: Record<string, string> = {};
      metaRows.forEach((row) => {
        meta[row.key] = row.value;
      });
      return { columns, meta };
    } finally {
      db.close();
    }
  });

  ipcMain.handle(IPC_CHANNELS.QUERY_RUN, (_event, request: QueryRequest): QueryResponse => {
    const cache = getCacheOrThrow(request.filePath);
    const db = new Database(cache.dbPath, { readonly: true });
    try {
      const metaRows = db.prepare('SELECT key, value FROM meta;').all() as Array<{
        key: string;
        value: string;
      }>;
      const meta: Record<string, string> = {};
      metaRows.forEach((row) => {
        meta[row.key] = row.value;
      });
      const builder = new QueryBuilder({
        table: 'logs',
        ftsField: meta['fts_field'],
        search: request.search,
        filters: request.filters,
        orderBy: request.orderBy ?? meta['timestamp_field'],
        orderDir: request.orderDir ?? 'DESC',
        limit: request.limit ?? 100,
        offset: request.offset ?? 0
      });
      const { sql, params } = builder.build();
      const rows = db.prepare(sql).all(params) as Record<string, unknown>[];
      const countStmt = builder.buildCount();
      const totalRow = db.prepare(countStmt.sql).get(countStmt.params) as { total: number };
      return {
        rows,
        total: totalRow?.total ?? 0
      };
    } finally {
      db.close();
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.FILTERS_GET_OPTIONS,
    (_event, payload: { filePath: string; columns: string[]; limit?: number }) => {
      const cache = getCacheOrThrow(payload.filePath);
      const db = new Database(cache.dbPath, { readonly: true });
      try {
        const limit = payload.limit ?? 20;
        const result: Record<string, string[]> = {};
        payload.columns.forEach((column) => {
          const stmt = db.prepare(
            `SELECT DISTINCT "${column}" as value FROM logs WHERE "${column}" IS NOT NULL LIMIT ${limit}`
          );
          const distinctRows = stmt.all() as Array<{ value: unknown }>;
          const values = distinctRows
            .map((row) => (row.value === null || row.value === undefined ? '' : String(row.value)))
            .filter((value) => value.length);
          result[column] = values;
        });
        return result;
      } finally {
        db.close();
      }
    }
  );
}
