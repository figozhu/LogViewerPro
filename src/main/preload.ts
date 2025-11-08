import * as electron from 'electron';
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
import type { UserPreferences } from '@shared/models/preferences';

const { contextBridge, ipcRenderer } = electron;

console.log('[Preload] context bridge initializing');

const menuOpenListeners = new Set<() => void>();
const menuHelpListeners = new Set<() => void>();
const indexProgressListeners = new Set<(payload: IndexProgressEvent) => void>();
const indexCompleteListeners = new Set<(payload: IndexCompleteEvent) => void>();
const appErrorListeners = new Set<(payload: { title: string; message: string }) => void>();
const indexErrorListeners = new Set<(payload: { jobId?: string; message: string }) => void>();

const emitTypedEvent = <T>(listeners: Set<(payload: T) => void>, payload: T) => {
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (error) {
      console.error('[Preload] Event callback failed', error);
    }
  }
};

ipcRenderer.on(IPC_CHANNELS.MENU_OPEN_FILE, () => {
  for (const listener of menuOpenListeners) {
    try {
      listener();
    } catch (error) {
      console.error('[Preload] Menu callback failed', error);
    }
  }
});

ipcRenderer.on(IPC_CHANNELS.MENU_OPEN_HELP, () => {
  for (const listener of menuHelpListeners) {
    try {
      listener();
    } catch (error) {
      console.error('[Preload] Help menu callback failed', error);
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
 * 閫氳繃 contextBridge 鏆撮湶鏋佸皬鐨?API 闈紝纭繚鎸佷箙瀹夊叏绛栫暐銆? */
contextBridge.exposeInMainWorld('logViewerApi', {
  /**
   * 閫氱煡涓昏繘绋嬪簲鐢ㄥ凡缁忓噯澶囧氨缁紝鍚庣画鍙墿灞曟洿澶氬垵濮嬪寲閫昏緫銆?   */
  notifyReady: (): Promise<{ timestamp: number }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.READY);
  },

  /**
   * 鍏佽娓叉煋灞傜洃鍚€滄墦寮€鏃ュ織鈥濊彍鍗曞懡浠わ紝骞跺湪闇€瑕佹椂鍙栨秷璁㈤槄銆?   */
  onMenuOpenFile: (handler: () => void): (() => void) => {
    menuOpenListeners.add(handler);
    return () => menuOpenListeners.delete(handler);
  },
  /**
   * 鍏佽娓叉煋灞傜洃鍚€滀娇鐢ㄥ府鍔┾€濊彍鍗曞懡浠わ紝骞堕殢鏃跺彇娑堣闃?   */
  onMenuOpenHelp: (handler: () => void): (() => void) => {
    menuHelpListeners.add(handler);
    return () => menuHelpListeners.delete(handler);
  },

  /**
   * 鑾峰彇褰撳墠鎵€鏈夋ā鏉裤€?   */
  getTemplates: (): Promise<LogTemplate[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_GET_ALL);
  },

  /**
   * 淇濆瓨鎴栨洿鏂版ā鏉裤€?   */
  saveTemplate: (payload: SaveTemplatePayload): Promise<LogTemplate> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_SAVE, payload);
  },

  /**
   * 鍒犻櫎鎸囧畾妯℃澘銆?   */
  deleteTemplate: (templateId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_DELETE, templateId);
  },

  /**
   * 鎵撳紑绯荤粺鏂囦欢閫夋嫨瀵硅瘽妗嗐€?   */
  openLogFileDialog: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE);
  },

  /**
   * 鍚姩绱㈠紩浠诲姟銆?   */
  startIndexing: (payload: IndexStartRequest): Promise<IndexStartResponse> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INDEX_START, payload);
  },

  /**
   * 鏈€杩戞枃浠舵搷浣溿€?   */
  getRecentItems: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.RECENT_ITEMS_GET);
  },
  saveRecentItem: (payload: { filePath: string; templateId: string; templateName: string }) => {
    return ipcRenderer.invoke(IPC_CHANNELS.RECENT_ITEMS_SAVE, payload);
  },

  /**
   * 鏍￠獙鏂囦欢璺緞鏄惁鍙銆?   */
  validateFile: (filePath: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_VALIDATE, filePath);
  },

  /**
   * 缂撳瓨淇℃伅涓庢竻鐞嗐€?   */
  getCacheSummary: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CACHE_INFO_GET);
  },
  clearCache: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CACHE_CLEAR_ALL);
  },
  openCacheDir: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CACHE_OPEN_DIR);
  },
  getRecentLogs: (limit?: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_RECENT, limit);
  },
  getPreferences: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.PREFERENCES_GET);
  },
  updatePreferences: (payload: Partial<UserPreferences>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.PREFERENCES_UPDATE, payload);
  },

  /**
   * 鍙栨秷绱㈠紩浠诲姟銆?   */
  cancelIndex: (jobId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.INDEX_CANCEL, jobId);
  },

  /**
   * 鏁版嵁鏌ヨ涓?Schema銆?   */
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
   * 鐩戝惉绱㈠紩杩涘害浜嬩欢銆?   */
  onIndexProgress: (handler: (payload: IndexProgressEvent) => void): (() => void) => {
    indexProgressListeners.add(handler);
    return () => indexProgressListeners.delete(handler);
  },

  /**
   * 鐩戝惉绱㈠紩瀹屾垚浜嬩欢銆?   */
  onIndexComplete: (handler: (payload: IndexCompleteEvent) => void): (() => void) => {
    indexCompleteListeners.add(handler);
    return () => indexCompleteListeners.delete(handler);
  },

  /**
   * 鐩戝惉绯荤粺绾ч敊璇€?   */
  onAppError: (handler: (payload: { title: string; message: string }) => void): (() => void) => {
    appErrorListeners.add(handler);
    return () => appErrorListeners.delete(handler);
  },

  /**
   * 鐩戝惉绱㈠紩閿欒銆?   */
  onIndexError: (handler: (payload: { jobId?: string; message: string }) => void): (() => void) => {
    indexErrorListeners.add(handler);
    return () => indexErrorListeners.delete(handler);
  }
});

