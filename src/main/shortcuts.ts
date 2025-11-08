import electron from './electron-shim';
import type { BrowserWindow as ElectronBrowserWindow } from 'electron';

const electronApi = electron ?? ({} as typeof import('electron'));
const { BrowserWindow, globalShortcut } = electronApi;

/**
 * 娉ㄥ唽鍏ㄥ眬蹇嵎閿紝渚夸簬寮€鍙戣皟璇曞拰鍩虹鎿嶄綔銆? * @param mainWindow 涓荤獥鍙ｅ疄渚? */
export function registerGlobalShortcuts(mainWindow: ElectronBrowserWindow): void {
  if (!globalShortcut) {
    return;
  }
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
      console.warn(`[Shortcuts] Failed to register shortcut: ${shortcut}`);
    }
  }
}

/**
 * 瑙ｉ櫎鎵€鏈夊凡娉ㄥ唽鐨勫叏灞€蹇嵎閿紝閬垮厤搴旂敤閫€鍑哄悗浠嶅崰鐢ㄣ€? */
export function unregisterGlobalShortcuts(): void {
  globalShortcut?.unregisterAll();
}


