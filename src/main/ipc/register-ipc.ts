import electron from '../electron-shim';
import type { BrowserWindow } from 'electron';
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
import { readRecentLogs } from '../logger';
import { PreferencesStore } from '../services/preferences-store';
import type { UserPreferences } from '@shared/models/preferences';
import type { SystemLogEntry } from '@shared/models/system-log';
import { setupApplicationMenu } from '../menu';
import { resolveAppText } from '../app-texts';

const electronApi = electron ?? ({} as typeof import('electron'));
const { dialog, ipcMain, shell } = electronApi;

interface RegisterIpcOptions {
  getMainWindow: () => BrowserWindow | null;
  workerManager: WorkerManager;
  templateStore?: TemplateStore;
  recentItemsStore?: RecentItemsStore;
  cacheManager?: IndexCacheManager;
  preferencesStore?: PreferencesStore;
}

/**
 * 娉ㄥ唽鎵€鏈?Renderer -> Main 鐨?IPC 閫氶亾銆?
 */
export function registerIpcHandlers(options: RegisterIpcOptions): void {
  if (!ipcMain) {
    return;
  }
  console.log('[Debug/IPC] registerIpcHandlers invoked');
  console.log('[Debug/IPC] registerIpcHandlers invoked', {
    hasWindow: Boolean(options.getMainWindow())
  });
  const store = options.templateStore ?? new TemplateStore();
  const recentStore = options.recentItemsStore ?? new RecentItemsStore();
  const cacheManager = options.cacheManager ?? new IndexCacheManager();
  const preferencesStore = options.preferencesStore ?? new PreferencesStore();
  const inFlightJobs = new Map<string, { cacheInfo: CacheInfo }>();
  const knownCaches = new Map<string, CacheInfo>();

  const getAppText = () => resolveAppText(preferencesStore.get().language);


  const getWindowOrThrow = (): BrowserWindow => {
    const window = options.getMainWindow();
    if (!window) {
      throw new Error(getAppText().errors.windowNotReady);
    }
    return window;
  };

  const getCacheOrThrow = (filePath: string): CacheInfo => {
    const cache = knownCaches.get(filePath);
    if (!cache) {
      throw new Error(getAppText().errors.cacheNotReady);
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

  ipcMain.handle(IPC_CHANNELS.CACHE_OPEN_DIR, async () => {
    const dir = cacheManager.getCacheDir();
    const errorMessage = await shell.openPath(dir);
    if (errorMessage) {
      throw new Error(getAppText().errors.openCacheDirFailed(errorMessage));
    }
    return { success: true, path: dir };
  });

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_RECENT, (_event, limit?: number): SystemLogEntry[] => {
    return readRecentLogs(limit ?? 200);
  });

  ipcMain.handle(IPC_CHANNELS.PREFERENCES_GET, () => {
    return preferencesStore.get();
  });

  ipcMain.handle(
    IPC_CHANNELS.PREFERENCES_UPDATE,
    (_event, patch: Partial<UserPreferences>): UserPreferences => {
      const updated = preferencesStore.update(patch);
      const window = options.getMainWindow();
      if (window) {
        setupApplicationMenu(window, updated.language);
      }
      return updated;
    }
  );

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    const window = getWindowOrThrow();
    const dialogText = getAppText();
    const result = await dialog.showOpenDialog(window, {
      title: dialogText.dialog.openLogTitle,
      properties: ['openFile'],
      filters: [
        { name: dialogText.dialog.logFilter, extensions: ['log', 'txt'] },
        { name: dialogText.dialog.allFiles, extensions: ['*'] }
      ]
    });
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.FILE_VALIDATE, async (_event, filePath: string) => {
    const fs = await import('node:fs/promises');
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(getAppText().errors.invalidLogFile);
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
      throw new Error('Selected template does not exist. Please refresh and try again.');
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
      const columnsRaw = db.prepare('PRAGMA table_info(logs);').all() as Array<{
        name: string;
        type: string;
        notnull: number;
      }>;
      const columnNames = columnsRaw.map((col) => col.name);
      const metaRows = db.prepare('SELECT key, value FROM meta;').all() as Array<{
        key: string;
        value: string;
      }>;
      const meta: Record<string, string> = {};
      metaRows.forEach((row) => {
        meta[row.key] = row.value;
      });
      const timestampField = meta['timestamp_field'];
      const ftsField = meta['fts_field'];
      const builder = new QueryBuilder({
        table: 'logs',
        allowedColumns: columnNames,
        defaultOrderBy: timestampField,
        ftsField,
        search: request.search,
        filters: request.filters,
        orderBy: request.orderBy,
        orderDir: request.orderDir ?? 'ASC',
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


