import electron from './electron-shim';
import type { BrowserWindow as ElectronBrowserWindow, MenuItemConstructorOptions } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { resolveMenuText } from './menu-texts';

const electronApi = electron ?? ({} as typeof import('electron'));
const { app, BrowserWindow, Menu, shell } = electronApi;

/**
 * 构建并安装应用主菜单，适配不同平台的交互习惯。
 * @param mainWindow 需要响应菜单命令的主窗口实例
 */
export function setupApplicationMenu(
  mainWindow: ElectronBrowserWindow | null,
  localeOverride?: string
): void {
  if (!app || !Menu) {
    return;
  }
  const isMac = process.platform === 'darwin';
  const menuText = resolveMenuText(
    localeOverride && localeOverride !== 'auto' ? localeOverride : app.getLocale()
  );
  const template: MenuItemConstructorOptions[] = [];

  const fileMenuSubmenu: MenuItemConstructorOptions[] = [
    {
      label: menuText.file.open,
      accelerator: 'CmdOrCtrl+O',
      click: () => {
        mainWindow?.webContents.send(IPC_CHANNELS.MENU_OPEN_FILE);
      }
    },
    { type: 'separator' }
  ];

  const editMenuSubmenu: MenuItemConstructorOptions[] = [
    { role: 'undo', label: menuText.edit.undo },
    { role: 'redo', label: menuText.edit.redo },
    { type: 'separator' },
    { role: 'cut', label: menuText.edit.cut },
    { role: 'copy', label: menuText.edit.copy },
    { role: 'paste', label: menuText.edit.paste }
  ];

  const windowMenuSubmenu: MenuItemConstructorOptions[] = [
    { role: 'minimize', label: menuText.window.minimize },
    { role: 'zoom', label: menuText.window.zoom }
  ];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about', label: menuText.macApp.about },
        { type: 'separator' },
        { role: 'services', label: menuText.macApp.services, submenu: [] },
        { type: 'separator' },
        { role: 'hide', label: menuText.macApp.hideApp },
        { role: 'hideOthers', label: menuText.macApp.hideOthers },
        { role: 'unhide', label: menuText.macApp.showAll },
        { type: 'separator' },
        { role: 'quit', label: menuText.macApp.quit }
      ]
    });

    editMenuSubmenu.push({
      role: 'pasteAndMatchStyle',
      label: menuText.edit.pasteAndMatchStyle
    });
    windowMenuSubmenu.push({ type: 'separator' }, { role: 'front', label: menuText.window.bringAllToFront });
    fileMenuSubmenu.push({ role: 'close', label: menuText.file.close });
  } else {
    fileMenuSubmenu.push({ role: 'quit', label: menuText.file.quit });
  }

  editMenuSubmenu.push({ role: 'selectAll', label: menuText.edit.selectAll });

  template.push(
    {
      label: menuText.file.label,
      submenu: fileMenuSubmenu
    },
    {
      label: menuText.edit.label,
      submenu: editMenuSubmenu
    },
    {
      label: menuText.view.label,
      submenu: [
        { role: 'reload', label: menuText.view.reload },
        { role: 'forceReload', label: menuText.view.forceReload },
        { role: 'toggleDevTools', label: menuText.view.toggleDevTools },
        { type: 'separator' },
        { role: 'resetZoom', label: menuText.view.resetZoom },
        { role: 'zoomIn', label: menuText.view.zoomIn },
        { role: 'zoomOut', label: menuText.view.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: menuText.view.toggleFullscreen }
      ]
    },
    {
      label: menuText.window.label,
      submenu: windowMenuSubmenu
    },
    {
      label: menuText.help.label,
      submenu: [
        {
          label: menuText.help.usage,
          click: () => {
            mainWindow?.webContents.send(IPC_CHANNELS.MENU_OPEN_HELP);
          }
        },
        { type: 'separator' },
        {
          label: menuText.help.homepage,
          click: () => {
            void shell.openExternal('https://github.com/figozhu/LogViewerPro');
          }
        }
      ]
    }
  );

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}



