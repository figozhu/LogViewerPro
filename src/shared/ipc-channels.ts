/**
 * @file 定义全局可复用的 IPC 通道名称，避免主进程与渲染进程之间硬编码字符串。
 */

export const IPC_CHANNELS = {
  READY: 'app:ready',
  MENU_OPEN_FILE: 'menu:openFileCommand',
  APP_ERROR: 'app:error',
  TEMPLATES_GET_ALL: 'templates:getAll',
  TEMPLATES_SAVE: 'templates:save',
  TEMPLATES_DELETE: 'templates:delete',
  DIALOG_OPEN_FILE: 'dialog:openFile',
  INDEX_START: 'index:start',
  INDEX_PROGRESS: 'index:progress',
  INDEX_COMPLETE: 'index:complete',
  INDEX_ERROR: 'index:error',
  INDEX_CANCEL: 'index:cancel',
  RECENT_ITEMS_GET: 'recentItems:get',
  RECENT_ITEMS_SAVE: 'recentItems:save',
  FILE_VALIDATE: 'file:validate',
  CACHE_INFO_GET: 'cache:info',
  CACHE_CLEAR_ALL: 'cache:clearAll',
  CACHE_OPEN_DIR: 'cache:openDir',
  LOGS_GET_RECENT: 'logs:getRecent',
  PREFERENCES_GET: 'preferences:get',
  PREFERENCES_UPDATE: 'preferences:update',
  SCHEMA_GET: 'schema:get',
  QUERY_RUN: 'query:run',
  FILTERS_GET_OPTIONS: 'filters:getOptions'
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
