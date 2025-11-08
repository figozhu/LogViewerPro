const enUS = {
  common: {
    confirmDeleteTemplate: 'Delete this template? This action cannot be undone.',
    copied: 'Copied',
    copyFailed: 'Copy failed'
  },
  app: {
    header: {
      title: 'LogViewer Pro',
      subtitle: 'Cross-platform GB-scale log parsing toolkit',
      actions: {
        quickOpen: 'Quick Open Log',
        retryHandshake: 'Retry Handshake'
      },
      languageLabel: 'Interface Language',
      language: {
        auto: 'Follow System',
        zhCN: 'Chinese',
        enUS: 'English'
      },
      handshakeLabel: 'Last handshake:',
      handshakePending: 'Not connected yet'
    },
    tabs: {
      logs: {
        label: 'Log Explorer',
        description: 'Open, parse and browse structured logs'
      },
      templates: {
        label: 'Template Manager',
        description: 'Maintain parsing templates and test regex quickly'
      },
      status: {
        label: 'Runtime Status',
        description: 'Review cache usage, jobs and errors'
      },
      systemLog: {
        label: 'System Logs',
        description: 'Inspect main-process and service logs'
      },
      preferences: {
        label: 'Preferences',
        description: 'Switch theme and default parameters'
      },
      help: {
        label: 'Help Center',
        description: 'Learn workflows and support channels'
      }
    },
    logsPanel: {
      title: 'Log Analysis Workspace',
      currentFile: 'Current file: {file}',
      statusLine: 'Index status: {status} · Phase: {phase} · Progress: {progress}%',
      buttons: {
        chooseFile: 'Choose Log File',
        refreshCache: 'Refresh Cache'
      }
    },
    status: {
      overviewTitle: 'Processing Overview',
      templateCount: 'Templates: {count}',
      lastFile: 'Last file: {file}',
      statusLine: 'Index status: {status} · Phase: {phase} · Progress: {progress}%',
      menuInvoke: 'Menu invoked: {count} times',
      latestError: 'Latest error: {message}',
      historyTitle: 'Error History'
    },
    cache: {
      title: 'Cache & Indexing',
      chipActive: 'Running',
      chipIdle: 'Idle',
      occupancy: 'Usage: {size}',
      entries: 'Cache entries: {count}',
      dirLabel: 'Directory: {path}',
      refresh: 'Refresh',
      openDir: 'Open Directory',
      clear: 'Clear Cache',
      refreshing: 'Refreshing...',
      clearing: 'Clearing...',
      noDir: 'Cache directory is not ready yet',
      noStats: 'Not available yet',
      empty: 'No cache yet. It will be created automatically after indexing.',
      cancel: 'Cancel Indexing',
      cancelling: 'Cancelling...',
      progress: 'Index progress: {phase} ({progress}%)',
      stats: 'Inserted: {inserted} · Unmatched: {skipped}',
      unmatchedHint: 'Unmatched samples (up to 5 lines)'
    },
    recent: {
      title: 'Recent Files',
      empty: 'No records yet',
      badgeMissingTemplate: 'Template removed',
      lastOpened: 'Last opened: {absolute} · {relative}',
      reopen: 'Reopen',
      unnamedTemplate: 'Untitled template'
    },
    dragOverlay: 'Drop the file here to start parsing',
    index: {
      phase: {
        idle: 'Idle',
        preparing: 'Preparing',
        cacheHit: 'Cache Hit',
        completed: 'Completed',
        cancelled: 'Cancelled'
      },
      status: {
        waiting: 'Waiting for task',
        jobStarted: 'Index job {id} started',
        cacheHit: 'Cache hit, load finished',
        cacheReload: 'Cache hit, reloaded instantly',
        completed: 'Index completed',
        cancelled: 'Index job cancelled'
      }
    },
    time: {
      unknown: 'Unknown time',
      justNow: 'Just now',
      minutesAgo: '{count} minutes ago',
      hoursAgo: '{count} hours ago',
      daysAgo: '{count} days ago',
      weeksAgo: '{count} weeks ago'
    },
    state: {
      noFile: 'No file selected',
      waitTask: 'Waiting for task',
      noError: 'No error yet',
      idlePhase: 'Idle',
      indexCancelled: 'Index job cancelled',
      indexCached: 'Cache hit, reloaded instantly',
      indexCompleted: 'Index completed',
      cacheUsed: 'Cache hit, load finished'
    },
    errors: {
      ipcHandshakeFailed: 'IPC handshake failed',
      fileOpenFailed: 'Failed to open file',
      openCacheDirFailed: 'Failed to open cache directory',
      cancelIndexFailed: 'Failed to cancel indexing',
      indexError: 'Indexing error'
    },
    drag: {
      noFile: 'No file detected in drop event',
      noPath: 'Cannot read file path'
    },
    cacheStats: {
      label: 'Inserted {inserted} · Skipped {skipped}'
    },
    placeholders: {
      waitRecent: 'Unknown time'
    }
  },
  help: {
    header: {
      title: 'Help Center',
      description: 'Learn how to handle large logs efficiently and master the shortcuts',
      homepage: 'View Project Homepage'
    },
    sections: {
      quickStart: 'Quick Start',
      shortcuts: 'Shortcuts',
      faq: 'FAQ',
      support: 'Support'
    },
    quickSteps: {
      step1: {
        title: '1. Choose or create a template',
        description: 'Configure named capture groups in “Template Manager” and mark timestamp/search fields.'
      },
      step2: {
        title: '2. Open a log file',
        description:
          'Use the menu, drag & drop, or the “Quick Open” button to select a file from the home screen.'
      },
      step3: {
        title: '3. Wait for indexing',
        description:
          'The first open builds an index. Track progress and cache usage under the “Status” tab.'
      },
      step4: {
        title: '4. Search & filter',
        description:
          'Use full-text search and auto-generated filters to locate critical information quickly.'
      }
    },
    shortcuts: {
      open: {
        key: 'Ctrl/Cmd + O',
        usage: 'Open log file'
      },
      search: {
        key: 'Ctrl/Cmd + F',
        usage: 'Focus the search input'
      },
      switchLogs: {
        key: 'Ctrl/Cmd + L',
        usage: 'Switch to Log tab'
      },
      preferences: {
        key: 'Ctrl/Cmd + ,',
        usage: 'Open preferences'
      }
    },
    faq: {
      slowIndex: {
        question: 'Indexing takes too long?',
        answer:
          'Refine regex templates to reduce unmatched lines and clear caches when needed under “Status”.'
      },
      jsonField: {
        question: 'JSON fields are hard to read?',
        answer: 'The detail panel auto-formats JSON. Copy it to an external formatter if needed.'
      },
      resetPreference: {
        question: 'How to reset theme or default limit?',
        answer: 'Open “Preferences” to switch theme, adjust default query size and window memory.'
      }
    },
    support: {
      issues: {
        title: 'GitHub Issues',
        detail: 'https://github.com/figozhu/LogViewerPro/issues'
      },
      logs: {
        title: 'Submit logs',
        detail: 'Export the latest errors within System Logs and attach a description.'
      },
      roadmap: {
        title: 'Roadmap & discussions',
        detail: 'Use GitHub Discussions to share ideas and requests.'
      }
    }
  },
  logViewer: {
    title: 'Log Records',
    emptyPrompt: 'Please finish indexing before viewing structured data.',
    searchPlaceholder: 'Full-text keyword (press Enter)',
    search: 'Run Query',
    searching: 'Searching...',
    filterAll: 'All',
    total: 'Total {count} rows',
    templateLabel: 'Template: {name}',
    loadHint: {
      more: 'Scroll down to load more ({current}/{total})',
      done: 'All rows displayed ({current}/{total})'
    },
    noResult: 'No results yet',
    detailTitle: 'Row Details',
    detailCurrent: 'Current selection: #{index}',
    detailPlaceholder: 'Select a row to review details',
    copy: 'Copy',
    copyFailed: 'Copy failed'
  },
  templateManager: {
    listTitle: 'Template List',
    createButton: 'New Template',
    loading: 'Loading templates...',
    empty: 'No templates yet. Create one to get started.',
    meta: 'Timestamp: {timestamp} ｜ Full-text: {fts}',
    edit: 'Edit',
    delete: 'Delete',
    panelTitle: {
      edit: 'Edit Template',
      create: 'Create Template',
      idle: 'Select a template on the left or create a new one'
    },
    confirmDelete: 'Delete this template? This action cannot be undone.',
    form: {
      nameLabel: 'Template Name',
      namePlaceholder: 'Enter a template name',
      regexLabel: 'Regular Expression',
      regexPlaceholder: 'Example: \\[(?<timestamp>...)\\] (?<message>...)',
      timestampLabel: 'Timestamp Field',
      timestampPlaceholder: 'e.g., timestamp',
      searchLabel: 'Full-text Field',
      searchPlaceholder: 'e.g., message',
      save: 'Save Template',
      saving: 'Saving...',
      cancel: 'Cancel'
    },
    tester: {
      title: 'Regex Tester',
      button: 'Run Test',
      placeholder: 'Paste sample logs, one per line',
      resultTitle: 'Matches ({count})',
      logLabel: 'Log:',
      unmatched: 'Unmatched',
      noResult: 'No matches yet'
    }
  },
  preferences: {
    title: 'User Preferences',
    description: 'Adjust default query size, theme and window memory. All changes save immediately.',
    themeLabel: 'UI Theme',
    themes: {
      dark: 'Dark',
      light: 'Light',
      system: 'Follow System'
    },
    defaultLimitLabel: 'Default query size',
    languageLabel: 'Interface language',
    languages: {
      auto: 'Auto (follow system)',
      zhCN: 'Chinese',
      enUS: 'English'
    },
    rememberLabel: 'Remember last window size',
    updatedAt: 'Last updated: {time}',
    error: 'Failed to save preferences. Please retry later.'
  },
  systemLog: {
    title: 'System Logs',
    description: 'Show unified app.log from main/worker/renderer for quick debugging.',
    retainLabel: 'Retention rows',
    refresh: 'Refresh Logs',
    refreshing: 'Refreshing...',
    empty: 'No logs yet. Refresh later.'
  },
  templateStore: {
    errors: {
      regexRequired: 'Please enter a regular expression first',
      regexTestFailed: 'Regex test failed: {message}'
    }
  },
  templateSelection: {
    noTemplates: 'No templates available. Please create one first.',
    title: 'Choose a Parsing Template',
    hint: 'Select a template to parse the log you are opening:',
    meta: 'Timestamp field: {timestamp} · Full-text field: {fts}',
    cancel: 'Cancel'
  }
};

export default enUS;
