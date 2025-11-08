import type { OpenDialogReturnValue } from 'electron';
import type {
  IndexCompleteEvent,
  IndexProgressEvent,
  IndexStartRequest,
  IndexStartResponse
} from '@shared/models/indexing';
import type { CacheSummary } from '@shared/models/cache';
import type { SystemLogEntry } from '@shared/models/system-log';
import type { UserPreferences } from '@shared/models/preferences';
import type { LogTemplate, SaveTemplatePayload } from '@shared/models/log-template';
import type {
  FilterOptionsRequest,
  FilterOptionsResponse,
  QueryRequest,
  QueryResponse,
  SchemaInfo
} from '@shared/models/query';

export interface LogViewerApi {
  /**
   * 通知主进程当前渲染线程已初始化完毕。
   */
  notifyReady: () => Promise<{ timestamp: number }>;

  /**
   * 监听主菜单触发的“打开日志”命令，返回取消订阅的方法。
   */
  onMenuOpenFile: (handler: () => void) => () => void;
  /**
   * 监听主菜单触发的“使用帮助”命令。
   */
  onMenuOpenHelp: (handler: () => void) => () => void;

  /**
   * 获取所有已保存模板。
   */
  getTemplates: () => Promise<LogTemplate[]>;

  /**
   * 保存或更新模板。
   */
  saveTemplate: (payload: SaveTemplatePayload) => Promise<LogTemplate>;

  /**
   * 删除模板。
   */
  deleteTemplate: (templateId: string) => Promise<{ success: boolean }>;

  /**
   * 打开系统文件选择器。
   */
  openLogFileDialog: () => Promise<OpenDialogReturnValue>;

  /**
   * 启动索引任务。
   */
  startIndexing: (payload: IndexStartRequest) => Promise<IndexStartResponse>;

  /**
   * 最近文件记录。
   */
  getRecentItems: () => Promise<
    Array<{ filePath: string; templateId: string; templateName: string; openedAt: number }>
  >;
  saveRecentItem: (payload: {
    filePath: string;
    templateId: string;
    templateName: string;
  }) => Promise<
    Array<{ filePath: string; templateId: string; templateName: string; openedAt: number }>
  >;

  /**
   * 校验文件路径。
   */
  validateFile: (
    filePath: string
  ) => Promise<{ filePath: string; size: number; modifiedAt: number }>;
  getCacheSummary: () => Promise<CacheSummary>;
  clearCache: () => Promise<CacheSummary>;
  openCacheDir: () => Promise<{ success: boolean; path: string }>;
  getRecentLogs: (limit?: number) => Promise<SystemLogEntry[]>;
  getPreferences: () => Promise<UserPreferences>;
  updatePreferences: (payload: Partial<UserPreferences>) => Promise<UserPreferences>;
  cancelIndex: (jobId: string) => Promise<{ success: boolean }>;
  getSchema: (filePath: string) => Promise<SchemaInfo>;
  runQuery: (payload: QueryRequest) => Promise<QueryResponse>;
  getFilterOptions: (payload: FilterOptionsRequest) => Promise<FilterOptionsResponse>;

  /**
   * 监听索引进度事件。
   */
  onIndexProgress: (handler: (payload: IndexProgressEvent) => void) => () => void;

  /**
   * 监听索引完成事件。
   */
  onIndexComplete: (handler: (payload: IndexCompleteEvent) => void) => () => void;

  /**
   * 监听系统级错误事件。
   */
  onAppError: (handler: (payload: { title: string; message: string }) => void) => () => void;
  onIndexError: (handler: (payload: { jobId?: string; message: string }) => void) => () => void;
}

declare global {
  interface Window {
    logViewerApi: LogViewerApi;
  }
}
