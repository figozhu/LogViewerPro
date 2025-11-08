import { app, BrowserWindow, Menu, MenuItemConstructorOptions, shell } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';

/**
 * 构建并安装应用主菜单，适配不同平台的交互习惯
 * @param mainWindow 需要响应菜单命令的主窗口实例
 */
export function setupApplicationMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [];

  const fileMenuSubmenu: MenuItemConstructorOptions[] = [
    {
      label: '打开日志文件',
      accelerator: 'CmdOrCtrl+O',
      click: () => {
        mainWindow.webContents.send(IPC_CHANNELS.MENU_OPEN_FILE);
      }
    },
    { type: 'separator' }
  ];

  const editMenuSubmenu: MenuItemConstructorOptions[] = [
    { role: 'undo', label: '撤销' },
    { role: 'redo', label: '重做' },
    { type: 'separator' },
    { role: 'cut', label: '剪切' },
    { role: 'copy', label: '复制' },
    { role: 'paste', label: '粘贴' }
  ];

  const windowMenuSubmenu: MenuItemConstructorOptions[] = [
    { role: 'minimize', label: '最小化' },
    { role: 'zoom', label: '缩放' }
  ];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about', label: '关于 LogViewer Pro' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide', label: '隐藏应用' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    });

    editMenuSubmenu.push({ role: 'pasteAndMatchStyle', label: '粘贴并匹配样式' });
    windowMenuSubmenu.push({ type: 'separator' }, { role: 'front', label: '全部置顶' });
    fileMenuSubmenu.push({ role: 'close', label: '关闭窗口' });
  } else {
    fileMenuSubmenu.push({ role: 'quit', label: '退出' });
  }

  editMenuSubmenu.push({ role: 'selectAll', label: '全选' });

  template.push(
    {
      label: '文件',
      submenu: fileMenuSubmenu
    },
    {
      label: '编辑',
      submenu: editMenuSubmenu
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '切换开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: windowMenuSubmenu
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '使用帮助',
          click: () => {
            mainWindow.webContents.send(IPC_CHANNELS.MENU_OPEN_HELP);
          }
        },
        { type: 'separator' },
        {
          label: '打开项目主页',
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
