import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { setupApplicationMenu } from './menu';
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts';
import { registerIpcHandlers } from './ipc/register-ipc';
import { WorkerManager } from './worker-manager';
import { initLogger, logger } from './logger';
import { setupGlobalErrorHandling } from './error-handler';
import { TemplateStore } from './services/template-store';
import { RecentItemsStore } from './services/recent-items-store';
import { IndexCacheManager } from './services/index-cache-manager';

let mainWindow: BrowserWindow | null = null;
let ipcRegistered = false;
const forwardToRenderer = (channel: string, payload: unknown) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
};

const workerManager = new WorkerManager(forwardToRenderer);
const templateStore = new TemplateStore();
const recentItemsStore = new RecentItemsStore();
let indexCacheManager: IndexCacheManager;

/**
 * 创建主窗口函数，负责加载渲染进程页面并设置基础行为。
 */
async function createMainWindow(): Promise<BrowserWindow> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const url = process.env['VITE_DEV_SERVER_URL'];
  if (url) {
    // 开发模式下直接指向 Vite Dev Server，保证热重载
    await mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 生产模式加载打包后的文件
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

app.whenReady().then(async () => {
  initLogger();
  setupGlobalErrorHandling({
    getMainWindow: () => mainWindow,
    forward: forwardToRenderer
  });
  logger.info('Application ready, creating main window');

  indexCacheManager = new IndexCacheManager();
  const window = await createMainWindow();
  setupApplicationMenu(window);
  registerGlobalShortcuts(window);
  workerManager.ensure();

  if (!ipcRegistered) {
    registerIpcHandlers({
      getMainWindow: () => mainWindow,
      workerManager,
      templateStore,
      recentItemsStore,
      cacheManager: indexCacheManager
    });
    ipcRegistered = true;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow().then((newWindow) => {
        setupApplicationMenu(newWindow);
        unregisterGlobalShortcuts();
        registerGlobalShortcuts(newWindow);
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  unregisterGlobalShortcuts();
  workerManager.dispose();
});
