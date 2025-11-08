import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type {
  IndexCompleteEvent,
  IndexProgressEvent,
  IndexStartRequest,
  IndexStartResponse
} from '@shared/models/indexing';
import type { LogTemplate, SaveTemplatePayload } from '@shared/models/log-template';
import type {
  FilterOptionsRequest,
  FilterOptionsResponse,
  QueryRequest,
  QueryResponse,
  SchemaInfo
} from '@shared/models/query';

const menuOpenListeners = new Set<() => void>();
const indexProgressListeners = new Set<(payload: IndexProgressEvent) => void>();
const indexCompleteListeners = new Set<(payload: IndexCompleteEvent) => void>();
const appErrorListeners = new Set<(payload: { title: string; message: string }) => void>();
const indexErrorListeners = new Set<(payload: { jobId?: string; message: string }) => void>();

const emitTypedEvent = <T>(listeners: Set<(payload: T) => void>, payload: T) => {
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (error) {
      console.error('[Preload] 事件回调执行失败', error);
    }
  }
};

ipcRenderer.on(IPC_CHANNELS.MENU_OPEN_FILE, () => {
  for (const listener of menuOpenListeners) {
    try {
      listener();
    } catch (error) {
      console.error('[Preload] 菜单回调执行失败', error);
    }
  }
});

ipcRenderer.on(IPC_CHANNELS.INDEX_PROGRESS, (_event, payload: IndexProgressEvent) => {
  emitTypedEvent(indexProgressListeners, payload);
});

ipcRenderer.on(IPC_CHANNELS.INDEX_COMPLETE, (_event, payload: IndexCompleteEvent) => {
  emitTypedEvent(indexCompleteListeners, payload);
});

ipcRenderer.on(IPC_CHANNELS.APP_ERROR, (_event, payload: { title: string; message: string }) => {
  emitTypedEvent(appErrorListeners, payload);
});

ipcRenderer.on(IPC_CHANNELS.INDEX_ERROR, (_event, payload: { jobId?: string; message: string }) => {
  emitTypedEvent(indexErrorListeners, payload);
});

/**
 * 通过 contextBridge 暴露极小的 API 面，确保持久安全策略。
 */
contextBridge.exposeInMainWorld('logViewerApi', {
  /**
   * 通知主进程应用已经准备就绪，后续可扩展更多初始化逻辑。
   */
  notifyReady: (): Promise<{ timestamp: number }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.READY);
  },

  /**
   * 允许渲染层监听“打开日志”菜单命令，并在需要时取消订阅。
   */
  onMenuOpenFile: (handler: () => void): (() => void) => {
    menuOpenListeners.add(handler);
    return () => menuOpenListeners.delete(handler);
  },

  /**
   * 获取当前所有模板。
   */
  getTemplates: (): Promise<LogTemplate[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_GET_ALL);
  },

  /**
   * 保存或更新模板。
   */
  saveTemplate: (payload: SaveTemplatePayload): Promise<LogTemplate> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_SAVE, payload);
  },

  /**
   * 删除指定模板。
   */
  deleteTemplate: (templateId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_DELETE, templateId);
  },

  /**
   * 打开系统文件选择对话框。
   */
  openLogFileDialog: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE);
  },

  /**
   * 启动索引任务。
   */
  startIndexing: (payload: IndexStartRequest): Promise<IndexStartResponse> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INDEX_START, payload);
  },

  /**
   * 最近文件操作。
   */
  getRecentItems: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.RECENT_ITEMS_GET);
  },
  saveRecentItem: (payload: { filePath: string; templateId: string; templateName: string }) => {
    return ipcRenderer.invoke(IPC_CHANNELS.RECENT_ITEMS_SAVE, payload);
  },

  /**
   * 校验文件路径是否可读。
   */
  validateFile: (filePath: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_VALIDATE, filePath);
  },

  /**
   * 缓存信息与清理。
   */
  getCacheSummary: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CACHE_INFO_GET);
  },
  clearCache: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CACHE_CLEAR_ALL);
  },

  /**
   * 取消索引任务。
   */
  cancelIndex: (jobId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.INDEX_CANCEL, jobId);
  },

  /**
   * 数据查询与 Schema。
   */
  getSchema: (filePath: string): Promise<SchemaInfo> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_GET, filePath);
  },
  runQuery: (payload: QueryRequest): Promise<QueryResponse> => {
    return ipcRenderer.invoke(IPC_CHANNELS.QUERY_RUN, payload);
  },
  getFilterOptions: (payload: FilterOptionsRequest): Promise<FilterOptionsResponse> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILTERS_GET_OPTIONS, payload);
  },

  /**
   * 监听索引进度事件。
   */
  onIndexProgress: (handler: (payload: IndexProgressEvent) => void): (() => void) => {
    indexProgressListeners.add(handler);
    return () => indexProgressListeners.delete(handler);
  },

  /**
   * 监听索引完成事件。
   */
  onIndexComplete: (handler: (payload: IndexCompleteEvent) => void): (() => void) => {
    indexCompleteListeners.add(handler);
    return () => indexCompleteListeners.delete(handler);
  },

  /**
   * 监听系统级错误。
   */
  onAppError: (handler: (payload: { title: string; message: string }) => void): (() => void) => {
    appErrorListeners.add(handler);
    return () => appErrorListeners.delete(handler);
  },

  /**
   * 监听索引错误。
   */
  onIndexError: (handler: (payload: { jobId?: string; message: string }) => void): (() => void) => {
    indexErrorListeners.add(handler);
    return () => indexErrorListeners.delete(handler);
  }
});
