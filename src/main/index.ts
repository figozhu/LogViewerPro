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
import { PreferencesStore } from './services/preferences-store';

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
const preferencesStore = new PreferencesStore();
let indexCacheManager: IndexCacheManager;

/**
 * 创建主窗口函数，负责加载渲染进程页面并设置基础行为。
 */
async function createMainWindow(): Promise<BrowserWindow> {
  const preferences = preferencesStore.get();
  const storedState = preferences.windowState ?? { width: 1280, height: 800 };
  const rememberState = preferences.rememberWindowState;
  const browserOptions: Electron.BrowserWindowConstructorOptions = {
    width: storedState.width ?? 1280,
    height: storedState.height ?? 800,
    x: rememberState ? storedState.x : undefined,
    y: rememberState ? storedState.y : undefined,
    minWidth: 960,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  };

  mainWindow = new BrowserWindow(browserOptions);

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    logger.info(`[RendererConsole:${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error(
      `[RendererLoadFailed] code=${errorCode} desc=${errorDescription} url=${validatedURL}`
    );
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error('[RendererCrashed]', details);
  });

  mainWindow.webContents.once('did-finish-load', () => {
    logger.info('[Renderer] did-finish-load');
  });

  const persistWindowState = () => {
    if (!preferencesStore.get().rememberWindowState || !mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    const bounds = mainWindow.getBounds();
    preferencesStore.update({
      windowState: {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        maximized: mainWindow.isMaximized()
      }
    });
  };

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', persistWindowState);
  mainWindow.on('move', persistWindowState);
  mainWindow.on('close', persistWindowState);
  mainWindow.on('maximize', persistWindowState);
  mainWindow.on('unmaximize', persistWindowState);

  if (rememberState && storedState.maximized) {
    mainWindow.maximize();
  }

  const url = process.env['VITE_DEV_SERVER_URL'];
  if (url) {
    // 开发模式下直接指向 Vite Dev Server，保证热重载
    await mainWindow.loadURL(url);
    logger.info('[Renderer] Loaded dev server URL', url);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 生产模式加载打包后的文件
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    logger.info('[Renderer] Loaded production bundle');
  }

  return mainWindow;
}

app.whenReady().then(async () => {
  initLogger();
  setupGlobalErrorHandling({
    getMainWindow: () => mainWindow,
    forward: forwardToRenderer,
    getLocale: () => preferencesStore.get().language
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
      cacheManager: indexCacheManager,
      preferencesStore
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
