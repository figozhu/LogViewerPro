import { BrowserWindow, globalShortcut } from 'electron';

/**
 * 注册全局快捷键，便于开发调试和基础操作。
 * @param mainWindow 主窗口实例
 */
export function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  const bindings: Record<string, () => void> = {
    'CommandOrControl+R': () => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.reload();
      }
    },
    'CommandOrControl+Shift+I': () => {
      if (!mainWindow.isDestroyed()) {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
      }
    }
  };

  for (const [shortcut, handler] of Object.entries(bindings)) {
    const success = globalShortcut.register(shortcut, handler);
    if (!success) {
      console.warn(`[Shortcuts] 无法注册快捷键：${shortcut}`);
    }
  }
}

/**
 * 解除所有已注册的全局快捷键，避免应用退出后仍占用。
 */
export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}
