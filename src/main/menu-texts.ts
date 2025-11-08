export type MenuLocale = 'zh-CN' | 'en-US';

interface MenuEntries {
  file: {
    label: string;
    open: string;
    quit: string;
    close: string;
  };
  edit: {
    label: string;
    undo: string;
    redo: string;
    cut: string;
    copy: string;
    paste: string;
    pasteAndMatchStyle: string;
    selectAll: string;
  };
  view: {
    label: string;
    reload: string;
    forceReload: string;
    toggleDevTools: string;
    resetZoom: string;
    zoomIn: string;
    zoomOut: string;
    toggleFullscreen: string;
  };
  window: {
    label: string;
    minimize: string;
    zoom: string;
    bringAllToFront: string;
  };
  help: {
    label: string;
    usage: string;
    homepage: string;
  };
  macApp: {
    about: string;
    services: string;
    hideApp: string;
    hideOthers: string;
    showAll: string;
    quit: string;
  };
}

const MENU_MESSAGES: Record<MenuLocale, MenuEntries> = {
  'zh-CN': {
    file: {
      label: '文件',
      open: '打开日志文件',
      quit: '退出',
      close: '关闭窗口'
    },
    edit: {
      label: '编辑',
      undo: '撤销',
      redo: '重做',
      cut: '剪切',
      copy: '复制',
      paste: '粘贴',
      pasteAndMatchStyle: '粘贴并匹配样式',
      selectAll: '全选'
    },
    view: {
      label: '视图',
      reload: '重新加载',
      forceReload: '强制重新加载',
      toggleDevTools: '切换开发者工具',
      resetZoom: '实际大小',
      zoomIn: '放大',
      zoomOut: '缩小',
      toggleFullscreen: '切换全屏'
    },
    window: {
      label: '窗口',
      minimize: '最小化',
      zoom: '缩放',
      bringAllToFront: '全部置顶'
    },
    help: {
      label: '帮助',
      usage: '使用帮助',
      homepage: '打开项目主页'
    },
    macApp: {
      about: '关于 LogViewer Pro',
      services: '服务',
      hideApp: '隐藏应用',
      hideOthers: '隐藏其他',
      showAll: '显示全部',
      quit: '退出'
    }
  },
  'en-US': {
    file: {
      label: 'File',
      open: 'Open Log File',
      quit: 'Quit',
      close: 'Close Window'
    },
    edit: {
      label: 'Edit',
      undo: 'Undo',
      redo: 'Redo',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      pasteAndMatchStyle: 'Paste and Match Style',
      selectAll: 'Select All'
    },
    view: {
      label: 'View',
      reload: 'Reload',
      forceReload: 'Force Reload',
      toggleDevTools: 'Toggle Developer Tools',
      resetZoom: 'Actual Size',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      toggleFullscreen: 'Toggle Fullscreen'
    },
    window: {
      label: 'Window',
      minimize: 'Minimize',
      zoom: 'Zoom',
      bringAllToFront: 'Bring All to Front'
    },
    help: {
      label: 'Help',
      usage: 'User Guide',
      homepage: 'Open Project Homepage'
    },
    macApp: {
      about: 'About LogViewer Pro',
      services: 'Services',
      hideApp: 'Hide App',
      hideOthers: 'Hide Others',
      showAll: 'Show All',
      quit: 'Quit'
    }
  }
};

const FALLBACK_LOCALE: MenuLocale = 'en-US';

export const resolveMenuText = (locale?: string): MenuEntries => {
  const normalized = locale?.toLowerCase() ?? '';
  if (normalized.startsWith('zh')) {
    return MENU_MESSAGES['zh-CN'];
  }
  if (normalized.startsWith('en')) {
    return MENU_MESSAGES['en-US'];
  }
  return MENU_MESSAGES[FALLBACK_LOCALE];
};
