import type { MenuLocale } from './menu-texts';

interface AppStrings {
  dialog: {
    openLogTitle: string;
    logFilter: string;
    allFiles: string;
  };
  errors: {
    windowNotReady: string;
    cacheNotReady: string;
    invalidLogFile: string;
    openCacheDirFailed: (message: string) => string;
  };
  globalErrors: {
    uncaughtExceptionTitle: string;
    unhandledRejectionTitle: string;
    dismissButton: string;
  };
}

const APP_MESSAGES: Record<MenuLocale, AppStrings> = {
  'zh-CN': {
    dialog: {
      openLogTitle: '选择日志文件',
      logFilter: '日志文件',
      allFiles: '所有文件'
    },
    errors: {
      windowNotReady: '主窗口尚未就绪',
      cacheNotReady: '该文件还未建立索引，请先执行索引操作',
      invalidLogFile: '请选择有效的日志文件路径',
      openCacheDirFailed: (message: string) => `打开缓存目录失败：${message}`
    },
    globalErrors: {
      uncaughtExceptionTitle: '未捕获异常',
      unhandledRejectionTitle: '未处理的 Promise 拒绝',
      dismissButton: '我知道了'
    }
  },
  'en-US': {
    dialog: {
      openLogTitle: 'Select Log File',
      logFilter: 'Log Files',
      allFiles: 'All Files'
    },
    errors: {
      windowNotReady: 'Main window is not ready yet.',
      cacheNotReady: 'This file has not been indexed. Please run indexing first.',
      invalidLogFile: 'Please choose a valid log file path.',
      openCacheDirFailed: (message: string) => `Failed to open cache directory: ${message}`
    },
    globalErrors: {
      uncaughtExceptionTitle: 'Uncaught Exception',
      unhandledRejectionTitle: 'Unhandled Promise Rejection',
      dismissButton: 'OK'
    }
  }
};

const normalizeLocale = (locale?: string): MenuLocale => {
  if (!locale) return 'en-US';
  return locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
};

export const resolveAppText = (locale?: string): AppStrings => {
  return APP_MESSAGES[normalizeLocale(locale)];
};
