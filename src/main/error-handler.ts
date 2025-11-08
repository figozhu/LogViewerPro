import { BrowserWindow, dialog } from 'electron';
import type { MessageBoxOptions } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { logger } from './logger';

type RendererForwarder = (channel: string, payload: unknown) => void;

interface SetupOptions {
  getMainWindow: () => BrowserWindow | null;
  forward: RendererForwarder;
}

/**
 * 捕获未处理异常/Promise 拒绝并进行日志记录与 UI 提示。
 */
export function setupGlobalErrorHandling({ getMainWindow, forward }: SetupOptions): void {
  const reportError = (title: string, error: unknown) => {
    const message = formatErrorMessage(error);
    logger.error(`${title}: ${message}`, error);
    forward(IPC_CHANNELS.APP_ERROR, { title, message });
    showDialog(title, message, getMainWindow());
  };

  process.on('uncaughtException', (error) => {
    reportError('未捕获异常', error);
  });

  process.on('unhandledRejection', (reason) => {
    reportError('未处理的 Promise 拒绝', reason);
  });
}

const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

let lastDialogTimestamp = 0;

const showDialog = (title: string, message: string, window: BrowserWindow | null): void => {
  const now = Date.now();
  if (now - lastDialogTimestamp < 2000) {
    return;
  }
  lastDialogTimestamp = now;

  const options: MessageBoxOptions = {
    type: 'error',
    title,
    message: title,
    detail: message,
    buttons: ['我知道了']
  };

  if (window && !window.isDestroyed()) {
    void dialog.showMessageBox(window, options);
  } else {
    void dialog.showMessageBox(options);
  }
};
