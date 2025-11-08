import electron from './electron-shim';
import type { BrowserWindow, MessageBoxOptions } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { logger } from './logger';

const electronApi = electron ?? ({} as typeof import('electron'));
const { dialog } = electronApi;
import { resolveAppText } from './app-texts';

type RendererForwarder = (channel: string, payload: unknown) => void;

interface SetupOptions {
  getMainWindow: () => BrowserWindow | null;
  forward: RendererForwarder;
  getLocale: () => string | undefined;
}

/**
 * 鎹曡幏鏈鐞嗗紓甯?Promise 鎷掔粷骞惰繘琛屾棩蹇楄褰曚笌 UI 鎻愮ず銆? */
export function setupGlobalErrorHandling({
  getMainWindow,
  forward,
  getLocale
}: SetupOptions): void {
  const getAppText = () => resolveAppText(getLocale());

  const reportError = (title: string, error: unknown) => {
    const message = formatErrorMessage(error);
    logger.error(`${title}: ${message}`, error);
    forward(IPC_CHANNELS.APP_ERROR, { title, message });
    showDialog(title, message, getMainWindow(), getAppText().globalErrors.dismissButton);
  };

  process.on('uncaughtException', (error) => {
    reportError(getAppText().globalErrors.uncaughtExceptionTitle, error);
  });

  process.on('unhandledRejection', (reason) => {
    reportError(getAppText().globalErrors.unhandledRejectionTitle, reason);
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

const showDialog = (
  title: string,
  message: string,
  window: BrowserWindow | null,
  dismissLabel: string
): void => {
  if (!dialog) {
    console.error(`[ErrorDialog] ${title}: ${message}`);
    return;
  }
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
    buttons: [dismissLabel]
  };

  if (window && !window.isDestroyed()) {
    void dialog.showMessageBox(window, options);
  } else {
    void dialog.showMessageBox(options);
  }
};


