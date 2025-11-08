const zhCN = {
  common: {
    confirmDeleteTemplate: '确定要删除该模板吗？此操作不可恢复。',
    copied: '复制成功',
    copyFailed: '复制失败'
  },
  app: {
    header: {
      title: 'LogViewer Pro',
      subtitle: '跨平台 GB 级日志解析工具',
      actions: {
        quickOpen: '快速打开日志',
        retryHandshake: '重新握手'
      },
      languageLabel: '界面语言',
      language: {
        auto: '跟随系统',
        zhCN: '简体中文',
        enUS: 'English'
      },
      handshakeLabel: '最近握手：',
      handshakePending: '尚未连接'
    },
    tabs: {
      logs: {
        label: '日志解析',
        description: '打开、解析与浏览日志文件'
      },
      templates: {
        label: '模板管理',
        description: '维护解析模板并快速测试正则'
      },
      status: {
        label: '运行状态',
        description: '查看缓存、任务与错误看板'
      },
      systemLog: {
        label: '系统日志',
        description: '查看主进程与服务日志'
      },
      preferences: {
        label: '个性化设置',
        description: '切换主题、调节默认参数'
      },
      help: {
        label: '使用帮助',
        description: '快速了解操作方式与支持渠道'
      }
    },
    logsPanel: {
      title: '日志解析工作区',
      currentFile: '当前文件：{file}',
      statusLine: '索引状态：{status} · 阶段：{phase} · 进度：{progress}%',
      buttons: {
        chooseFile: '选择日志文件',
        refreshCache: '刷新缓存'
      }
    },
    status: {
      overviewTitle: '解析任务概览',
      templateCount: '模板总数：{count} 个',
      lastFile: '最近文件：{file}',
      statusLine: '索引状态：{status} · 阶段：{phase} · 进度：{progress}%',
      menuInvoke: '菜单触发：{count} 次',
      latestError: '最新错误：{message}',
      historyTitle: '错误历史'
    },
    cache: {
      title: '缓存与索引',
      chipActive: '进行中',
      chipIdle: '空闲',
      occupancy: '占用：{size}',
      entries: '缓存条目：{count}',
      dirLabel: '目录：{path}',
      refresh: '刷新',
      openDir: '打开目录',
      clear: '清空缓存',
      refreshing: '刷新中...',
      clearing: '清理中...',
      noDir: '缓存目录尚未生成',
      noStats: '尚未统计',
      empty: '暂无缓存，完成索引后会自动生成。',
      cancel: '取消索引',
      cancelling: '取消中...',
      progress: '索引进度：{phase} ({progress}%)',
      stats: '写入：{inserted} · 未匹配：{skipped}',
      unmatchedHint: '未匹配示例（最多 5 行）'
    },
    recent: {
      title: '最近打开',
      empty: '暂无打开记录',
      badgeMissingTemplate: '模板已删除',
      lastOpened: '上次打开：{absolute} · {relative}',
      reopen: '重新打开',
      unnamedTemplate: '未命名模板'
    },
    dragOverlay: '释放文件即可开始解析',
    index: {
      phase: {
        idle: '无',
        preparing: '准备中',
        cacheHit: '命中缓存',
        completed: '完成',
        cancelled: '已取消'
      },
      status: {
        waiting: '等待任务',
        jobStarted: '索引任务 {id} 已启动',
        cacheHit: '命中缓存，已完成加载',
        cacheReload: '命中缓存，已瞬时加载',
        completed: '索引完成',
        cancelled: '索引任务已取消'
      }
    },
    time: {
      unknown: '时间未知',
      justNow: '刚刚',
      minutesAgo: '{count} 分钟前',
      hoursAgo: '{count} 小时前',
      daysAgo: '{count} 天前',
      weeksAgo: '{count} 周前'
    },
    state: {
      noFile: '尚未选择',
      waitTask: '等待任务',
      noError: '暂无错误',
      idlePhase: '无',
      indexCancelled: '索引任务已取消',
      indexCached: '命中缓存，已瞬时加载',
      indexCompleted: '索引完成',
      cacheUsed: '命中缓存，已完成加载'
    },
    errors: {
      ipcHandshakeFailed: 'IPC 握手失败',
      fileOpenFailed: '文件打开失败',
      openCacheDirFailed: '打开缓存目录失败',
      cancelIndexFailed: '取消任务失败',
      indexError: '索引错误'
    },
    drag: {
      noFile: '未检测到拖拽的文件',
      noPath: '无法读取文件路径'
    },
    cacheStats: {
      label: '写入 {inserted} · 跳过 {skipped}'
    },
    placeholders: {
      waitRecent: '时间未知'
    }
  },
  help: {
    header: {
      title: '使用帮助',
      description: '了解如何高效地解析大型日志文件，并掌握常用快捷操作',
      homepage: '查看项目主页'
    },
    sections: {
      quickStart: '快速上手',
      shortcuts: '常用快捷键',
      faq: '常见问题',
      support: '反馈与支持'
    },
    quickSteps: {
      step1: {
        title: '1. 选择或创建模板',
        description: '在“模板管理”中配置命名捕获组，确保时间字段与全文字段已指定。'
      },
      step2: {
        title: '2. 打开日志文件',
        description: '可以通过菜单、拖拽或主界面的“快速打开”按钮触发文件选择。'
      },
      step3: {
        title: '3. 等待解析完成',
        description: '首次解析会建立索引，进度与缓存信息可在“运行状态”标签中查看。'
      },
      step4: {
        title: '4. 搜索与筛选',
        description: '利用全文搜索与自动生成的筛选器快速定位关键信息。'
      }
    },
    shortcuts: {
      open: {
        key: 'Ctrl/Cmd + O',
        usage: '打开日志文件'
      },
      search: {
        key: 'Ctrl/Cmd + F',
        usage: '聚焦全文搜索输入框'
      },
      switchLogs: {
        key: 'Ctrl/Cmd + L',
        usage: '快速切换到日志标签'
      },
      preferences: {
        key: 'Ctrl/Cmd + ,',
        usage: '打开用户偏好设置'
      }
    },
    faq: {
      slowIndex: {
        question: '索引耗时较长怎么办？',
        answer: '确保模板正则尽量精准以减少未匹配行，必要时清理缓存后重试。'
      },
      jsonField: {
        question: '字段内容是 JSON 时难以阅读？',
        answer: '行详情面板会自动尝试格式化，仍需调整时可复制到外部工具查看。'
      },
      resetPreference: {
        question: '怎样恢复默认主题或查询条数？',
        answer: '前往“个性化设置”标签即可调整主题、默认查询行数与窗口记忆等选项。'
      }
    },
    support: {
      issues: {
        title: 'GitHub Issues',
        detail: 'https://github.com/figozhu/LogViewerPro/issues'
      },
      logs: {
        title: '提交日志反馈',
        detail: '在系统日志标签导出最近错误，并附带说明以便快速定位问题。'
      },
      roadmap: {
        title: '产品路线',
        detail: '欢迎在 Discussions 中提出新需求与改进建议。'
      }
    }
  },
  logViewer: {
    title: '日志记录',
    emptyPrompt: '请先完成索引，随后可查看结构化数据',
    searchPlaceholder: '全文搜索关键字（回车执行）',
    search: '执行查询',
    searching: '查询中...',
    filterAll: '全部',
    total: '总计 {count} 条',
    templateLabel: '模板：{name}',
    loadHint: {
      more: '向下滚动加载更多（{current}/{total}）',
      done: '已展示全部（{current}/{total}）'
    },
    noResult: '暂无查询结果',
    detailTitle: '行详情',
    detailCurrent: '当前选择：第 {index} 条',
    detailPlaceholder: '请选择一条日志以查看详情',
    copy: '复制',
    copyFailed: '复制失败'
  },
  templateManager: {
    listTitle: '模板列表',
    createButton: '新建模板',
    loading: '正在加载模板...',
    empty: '暂无模板，请先创建。',
    meta: '时间字段：{timestamp} ｜ 全文字段：{fts}',
    edit: '编辑',
    delete: '删除',
    panelTitle: {
      edit: '编辑模板',
      create: '创建模板',
      idle: '请选择左侧模板或创建新模板'
    },
    confirmDelete: '确定要删除该模板吗？此操作不可恢复。',
    form: {
      nameLabel: '模板名称',
      namePlaceholder: '请输入模板名称',
      regexLabel: '正则表达式',
      regexPlaceholder: '示例：[ (?<timestamp>...) ] (?<message>...)',
      timestampLabel: '时间字段',
      timestampPlaceholder: '例如 timestamp',
      searchLabel: '全文字段',
      searchPlaceholder: '例如 message',
      save: '保存模板',
      saving: '保存中...',
      cancel: '取消'
    },
    tester: {
      title: '正则测试工具',
      button: '运行测试',
      placeholder: '粘贴示例日志，每行一个样本',
      resultTitle: '匹配结果（{count} 条）',
      logLabel: '日志：',
      unmatched: '未匹配',
      noResult: '暂无匹配结果'
    }
  },
  preferences: {
    title: '用户偏好',
    description: '调整默认查询条数、主题以及窗口记忆策略，所有修改即时生效并自动保存。',
    themeLabel: 'UI 主题',
    themes: {
      dark: '深色',
      light: '浅色',
      system: '跟随系统'
    },
    defaultLimitLabel: '默认查询条数',
     languageLabel: '界面语言',
    languages: {
      auto: '自动（跟随系统）',
      zhCN: '中文',
      enUS: '英文'
    },
    rememberLabel: '记住上次窗口尺寸',
    updatedAt: '最后更新：{time}',
    error: '保存偏好失败，请稍后重试。'
  },
  systemLog: {
    title: '系统日志',
    description: '展示主进程、Worker、Renderer 统一写入的 app.log，便于排查问题。',
    retainLabel: '保留行数',
    refresh: '刷新日志',
    refreshing: '刷新中...',
    empty: '暂无日志，请稍后刷新。'
  },
  templateStore: {
    errors: {
      regexRequired: '请先输入正则表达式',
      regexTestFailed: '正则测试失败：{message}'
    }
  },
  templateSelection: {
    noTemplates: '当前没有可用模板，请先创建模板。',
    title: '选择解析模板',
    hint: '请选择一个模板用于解析本次打开的日志文件：',
    meta: '时间字段：{timestamp} · 全文字段：{fts}',
    cancel: '取消'
  }
};

export default zhCN;
