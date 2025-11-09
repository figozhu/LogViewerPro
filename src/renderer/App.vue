<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import TemplateManager from './components/templates/TemplateManager.vue';
import LogViewer from './components/log-viewer/LogViewer.vue';
import HelpCenter from './components/help/HelpCenter.vue';
import SystemLogPanel from './components/system/SystemLogPanel.vue';
import UserPreferencesPanel from './components/system/UserPreferencesPanel.vue';
import i18n from './i18n';
import type { IndexCompleteEvent, IndexProgressEvent } from '@shared/models/indexing';
import { useTemplateStore } from './stores/templateStore';
import { useLogsStore } from './stores/logsStore';
import { promptTemplateSelection, type TemplateSelectionResult } from './modules/templateSelection';
import type { CacheSummary } from '@shared/models/cache';
import { usePreferenceStore } from './stores/preferenceStore';

const { t } = useI18n();

const bridge = window.logViewerApi;
if (!bridge) {
  console.error('[Renderer] bridge is unavailable');
  throw new Error('IPC bridge missing');
}

type ProgressPhase = 'idle' | 'preparing' | 'parsing' | 'cache' | 'completed' | 'cancelled';
type IndexStatusMessage =
  | { key: 'waiting' }
  | { key: 'jobStarted'; id: string }
  | { key: 'cacheHit' }
  | { key: 'cacheReload' }
  | { key: 'completed' }
  | { key: 'cancelled' };

const handshakeTime = ref<string | null>(null);
const menuInvokeCount = ref(0);
const lastOpenedFile = ref<string | null>(null);
const indexingStatus = ref<IndexStatusMessage>({ key: 'waiting' });
const progressPhase = ref<ProgressPhase>('idle');
const progressValue = ref(0);
const currentJobId = ref<string | null>(null);
const latestAppError = ref<string | null>(null);
const errorHistory = ref<Array<{ title: string; message: string; timestamp: string }>>([]);
const isDragOver = ref(false);
const dragError = ref('');
const cacheSummary = ref<CacheSummary | null>(null);
const cacheInfoLoading = ref(false);
const clearingCache = ref(false);
const isCancelling = ref(false);
const isIndexing = computed(() => currentJobId.value !== null);
const lastIndexStats = ref<{ inserted?: number; skipped?: number; unmatched?: string[] }>({});

const phaseLabelMap: Record<ProgressPhase, () => string> = {
  idle: () => t('app.index.phase.idle'),
  preparing: () => t('app.index.phase.preparing'),
  parsing: () => t('app.index.phase.parsing'),
  cache: () => t('app.index.phase.cacheHit'),
  completed: () => t('app.index.phase.completed'),
  cancelled: () => t('app.index.phase.cancelled')
};

const progressPhaseLabel = computed(() => phaseLabelMap[progressPhase.value]());
const indexingMessageText = computed(() => {
  const status = indexingStatus.value;
  switch (status.key) {
    case 'jobStarted':
      return t('app.index.status.jobStarted', { id: status.id });
    case 'cacheHit':
      return t('app.index.status.cacheHit');
    case 'cacheReload':
      return t('app.index.status.cacheReload');
    case 'completed':
      return t('app.index.status.completed');
    case 'cancelled':
      return t('app.index.status.cancelled');
    case 'waiting':
    default:
      return t('app.index.status.waiting');
  }
});

const handshakeDisplay = computed(
  () => handshakeTime.value ?? t('app.header.handshakePending')
);
const currentFileDisplay = computed(
  () => lastOpenedFile.value ?? t('app.state.noFile')
);
const statusOverviewText = computed(() =>
  t('app.status.statusLine', {
    status: indexingMessageText.value,
    phase: progressPhaseLabel.value,
    progress: progressValue.value
  })
);
const cacheProgressText = computed(() =>
  t('app.cache.progress', { phase: progressPhaseLabel.value, progress: progressValue.value })
);

type AppTab = 'logs' | 'templates' | 'status' | 'preferences' | 'systemLog' | 'help';

/**
 * 顶部标签集合，便于后续迭代时统一配置元数�?
 */
const tabs = computed(
  (): Array<{ id: AppTab; label: string; description: string }> => [
    {
      id: 'logs',
      label: t('app.tabs.logs.label'),
      description: t('app.tabs.logs.description')
    },
    {
      id: 'templates',
      label: t('app.tabs.templates.label'),
      description: t('app.tabs.templates.description')
    },
    {
      id: 'status',
      label: t('app.tabs.status.label'),
      description: t('app.tabs.status.description')
    },
    {
      id: 'systemLog',
      label: t('app.tabs.systemLog.label'),
      description: t('app.tabs.systemLog.description')
    },
    {
      id: 'preferences',
      label: t('app.tabs.preferences.label'),
      description: t('app.tabs.preferences.description')
    },
    {
      id: 'help',
      label: t('app.tabs.help.label'),
      description: t('app.tabs.help.description')
    }
  ]
);
const activeTab = ref<AppTab>('logs');

let disposeMenuListener: (() => void) | null = null;
let disposeHelpMenuListener: (() => void) | null = null;
let disposeProgressListener: (() => void) | null = null;
let disposeCompleteListener: (() => void) | null = null;
let disposeAppErrorListener: (() => void) | null = null;
let disposeIndexErrorListener: (() => void) | null = null;

const templateStore = useTemplateStore();
const logsStore = useLogsStore();
const preferenceStore = usePreferenceStore();
const { templates, recentItems } = storeToRefs(templateStore);
const templateCount = computed(() => templates.value.length);
const resolvedPreferences = computed(() => preferenceStore.resolved);
const languageOptions = computed(() => [
  { value: 'auto', label: t('app.header.language.auto') },
  { value: 'zh-CN', label: t('app.header.language.zhCN') },
  { value: 'en-US', label: t('app.header.language.enUS') }
]);
const currentLanguage = computed(() => resolvedPreferences.value.language ?? 'auto');

const syncQueryLimitFromPreference = () => {
  void logsStore.setDefaultLimit(resolvedPreferences.value.defaultQueryLimit);
};

const applyThemePreference = () => {
  const preference = resolvedPreferences.value.theme;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveTheme = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = effectiveTheme;
};

const themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const handleSystemThemeChange = () => {
  if (resolvedPreferences.value.theme === 'system') {
    applyThemePreference();
  }
};

const determineLocale = () => {
  const preference = resolvedPreferences.value.language;
  if (preference === 'auto') {
    const browserLang = navigator.language?.toLowerCase() ?? '';
    return browserLang.startsWith('zh') ? 'zh-CN' : 'en-US';
  }
  return preference;
};

const applyLanguagePreference = () => {
  const locale = determineLocale();
  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;
};

const handleLanguageChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as 'auto' | 'zh-CN' | 'en-US';
  void preferenceStore.updatePreferences({ language: value });
};

watch(
  () => resolvedPreferences.value.defaultQueryLimit,
  (newLimit, oldLimit) => {
    if (newLimit !== oldLimit) {
      syncQueryLimitFromPreference();
    }
  }
);

watch(
  () => resolvedPreferences.value.theme,
  (newTheme, oldTheme) => {
    if (newTheme !== oldTheme) {
      applyThemePreference();
    }
  }
);

watch(
  () => resolvedPreferences.value.language,
  (newLang, oldLang) => {
    if (newLang !== oldLang) {
      applyLanguagePreference();
    }
  }
);

/**
 * 以更新时间倒序展示缓存条目列表，供 UI 快速浏览最近的索引产物�?
 */
const cacheEntriesView = computed(() => {
  if (!cacheSummary.value) return [];
  return [...cacheSummary.value.entries]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)
    .map((entry) => ({
      ...entry,
      displaySize: formatBytes(entry.size),
      displayUpdatedAt: formatDateTime(entry.updatedAt),
      statsLabel: formatCacheStats(entry.insertedRows, entry.skippedRows)
    }));
});

const cacheDirPath = computed(() => cacheSummary.value?.cacheDir ?? t('app.cache.noDir'));

/**
 * 最近打开列表的展示模型，附带时间描述与模板可用性标记�?
 */
const recentItemsView = computed(() => {
  const templateMap = new Map(templates.value.map((tpl) => [tpl.id, tpl]));
  return recentItems.value.map((item) => {
    const template = templateMap.get(item.templateId);
    const displayName =
      template?.name ?? item.templateName ?? t('app.recent.unnamedTemplate');
    return {
      ...item,
      displayName,
      openedAtAbsolute: item.openedAt ? formatDateTime(item.openedAt) : t('app.time.unknown'),
      openedAtRelative: item.openedAt ? formatRelativeTime(item.openedAt) : t('app.time.unknown'),
      missingTemplate: !template
    };
  });
});

const appendErrorHistory = (title: string, message: string) => {
  errorHistory.value.unshift({ title, message, timestamp: new Date().toLocaleString() });
  if (errorHistory.value.length > 5) {
    errorHistory.value.pop();
  }
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const reportError = (title: string, error: unknown) => {
  const message = formatError(error);
  latestAppError.value = `${title}�?{message}`;
  appendErrorHistory(title, message);
};

const pingMainProcess = async () => {
  try {
    const response = await bridge.notifyReady();
    handshakeTime.value = new Date(response.timestamp).toLocaleString();
  } catch (error) {
    reportError(t('app.errors.ipcHandshakeFailed'), error);
  }
};

const selectTemplate = async (
  preferredTemplateId?: string
): Promise<TemplateSelectionResult | null> => {
  if (preferredTemplateId) {
    const template = templates.value.find((tpl) => tpl.id === preferredTemplateId);
    if (template) {
      return { templateId: template.id, templateName: template.name };
    }
  }
  return promptTemplateSelection(templates.value);
};

const handleExternalFileOpen = async (filePath: string, preferredTemplateId?: string) => {
  try {
    dragError.value = '';
    await bridge.validateFile(filePath);
    const selection = await selectTemplate(preferredTemplateId);
    if (!selection) return;

    lastOpenedFile.value = filePath;
    await templateStore.saveRecent(filePath, selection.templateId, selection.templateName);
    progressPhase.value = 'preparing';
    progressValue.value = 0;
    lastIndexStats.value = {};
    const { jobId, cacheUsed } = await bridge.startIndexing({
      filePath,
      templateId: selection.templateId
    });
    if (cacheUsed) {
      currentJobId.value = null;
      progressPhase.value = 'cache';
      progressValue.value = 100;
      indexingStatus.value = { key: 'cacheHit' };
      void logsStore.setActiveFile(filePath);
      void refreshCacheSummary();
    } else {
      currentJobId.value = jobId;
      indexingStatus.value = { key: 'jobStarted', id: jobId };
    }
  } catch (error) {
    dragError.value = formatError(error);
    reportError(t('app.errors.fileOpenFailed'), error);
  }
};

/**
 * 统一的文件对话框打开流程，供菜单与快捷按钮复�?
 */
const openFileDialogAndHandle = async (): Promise<boolean> => {
  const result = await bridge.openLogFileDialog();
  if (result.canceled || result.filePaths.length === 0) {
    return false;
  }
  await handleExternalFileOpen(result.filePaths[0]);
  return true;
};

const handleMenuOpen = async () => {
  menuInvokeCount.value += 1;
  await openFileDialogAndHandle();
};

/**
 * 顶部快捷按钮使用的打开逻辑，直接复用统一的文件对话框流程
 */
const handleQuickOpenClick = async () => {
  await openFileDialogAndHandle();
};

const handleIndexProgress = (payload: IndexProgressEvent) => {
  if (!currentJobId.value || payload.jobId !== currentJobId.value) return;
  progressPhase.value = payload.phase;
  progressValue.value = payload.progress;
};

const handleIndexComplete = (payload: IndexCompleteEvent) => {
  if (!currentJobId.value || payload.jobId !== currentJobId.value) return;
  lastIndexStats.value = {
    inserted: payload.inserted,
    skipped: payload.skipped,
    unmatched: payload.unmatched
  };
  if (payload.cancelled) {
    indexingStatus.value = { key: 'cancelled' };
  } else if (payload.cacheUsed) {
    indexingStatus.value = { key: 'cacheReload' };
  } else {
    indexingStatus.value = { key: 'completed' };
  }
  progressPhase.value = payload.cancelled ? 'cancelled' : 'completed';
  progressValue.value = payload.cancelled ? progressValue.value : 100;
  currentJobId.value = null;
  if (!payload.cancelled && lastOpenedFile.value) {
    void logsStore.setActiveFile(lastOpenedFile.value);
  }
  void refreshCacheSummary();
};

const handleAppError = (payload: { title: string; message: string }) => {
  latestAppError.value = `${payload.title} - ${payload.message}`;
  appendErrorHistory(payload.title, payload.message);
};

const reopenRecent = async (item: { filePath: string; templateId: string }) => {
  await handleExternalFileOpen(item.filePath, item.templateId);
};

/**
 * 主动拉取缓存汇总信息，配合索引流程保持 UI 与磁盘状态一致�?
 */
const refreshCacheSummary = async () => {
  cacheInfoLoading.value = true;
  try {
    cacheSummary.value = await bridge.getCacheSummary();
  } finally {
    cacheInfoLoading.value = false;
  }
};

const clearCache = async () => {
  clearingCache.value = true;
  try {
    cacheSummary.value = await bridge.clearCache();
  } finally {
    clearingCache.value = false;
  }
};

const openCacheDir = async () => {
  try {
    await bridge.openCacheDir();
  } catch (error) {
    reportError(t('app.errors.openCacheDirFailed'), error);
  }
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;
};

const onDragLeave = (event: DragEvent) => {
  event.preventDefault();
  if (!event.relatedTarget) {
    isDragOver.value = false;
  }
};

const onDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) {
    dragError.value = t('app.drag.noFile');
    return;
  }
  const file = files[0] as File & { path?: string };
  const filePath = file.path;
  if (!filePath) {
    dragError.value = t('app.drag.noPath');
    return;
  }
  void handleExternalFileOpen(filePath);
};

/**
 * 根据缓存统计生成可读文本，方便在列表中展示写�?跳过数量�?
 */
const formatCacheStats = (inserted?: number, skipped?: number): string => {
  const insertedText = inserted ?? '\u2014';
  const skippedText = skipped ?? '\u2014';
  return t('app.cache.stats', { inserted: insertedText, skipped: skippedText });
};

/**
 * 将字节数转换为可读字符串（KB/MB/GB），用于缓存占用展示�?
 */
const formatBytes = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  let value = size;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

/**
 * 将时间戳格式化为本地时间字符串，统一 UI 展示格式�?
 */
const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return t('app.time.unknown');
  return new Date(timestamp).toLocaleString();
};

/**
 * 计算相对时间（几分钟�?几小时前），用于最近列表提示�?
 */
const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return t('app.time.unknown');
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return t('app.time.justNow');
  if (diff < hour) return t('app.time.minutesAgo', { count: Math.floor(diff / minute) });
  if (diff < day) return t('app.time.hoursAgo', { count: Math.floor(diff / hour) });
  if (diff < day * 7) return t('app.time.daysAgo', { count: Math.floor(diff / day) });
  if (diff < day * 30) return t('app.time.weeksAgo', { count: Math.floor(diff / (day * 7)) });
  return new Date(timestamp).toLocaleDateString();
};

const cancelIndexing = async () => {
  if (!currentJobId.value) {
    return;
  }
  isCancelling.value = true;
  try {
    await bridge.cancelIndex(currentJobId.value);
  } catch (error) {
    reportError(t('app.errors.cancelIndexFailed'), error);
  } finally {
    isCancelling.value = false;
  }
};

onMounted(() => {
  void pingMainProcess();
  void templateStore.fetchAll();
  void templateStore.fetchRecent();
  themeMediaQuery.addEventListener('change', handleSystemThemeChange);
  void preferenceStore
    .fetchPreferences()
    .then(() => {
      syncQueryLimitFromPreference();
      applyThemePreference();
      applyLanguagePreference();
    })
    .catch(() => {
      applyThemePreference();
      applyLanguagePreference();
    });
  void refreshCacheSummary();
  disposeMenuListener = bridge.onMenuOpenFile(() => {
    void handleMenuOpen();
  });
  disposeHelpMenuListener = bridge.onMenuOpenHelp(() => {
    activeTab.value = 'help';
  });
  disposeProgressListener = bridge.onIndexProgress(handleIndexProgress);
  disposeCompleteListener = bridge.onIndexComplete(handleIndexComplete);
  disposeAppErrorListener = bridge.onAppError(handleAppError);
  disposeIndexErrorListener = bridge.onIndexError((payload: { message: string }) => {
    reportError(t('app.errors.indexError'), payload.message);
  });
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);
});

onBeforeUnmount(() => {
  disposeMenuListener?.();
  disposeHelpMenuListener?.();
  disposeProgressListener?.();
  disposeCompleteListener?.();
  disposeAppErrorListener?.();
  disposeIndexErrorListener?.();
  themeMediaQuery.removeEventListener('change', handleSystemThemeChange);
  window.removeEventListener('dragover', onDragOver);
  window.removeEventListener('dragleave', onDragLeave);
  window.removeEventListener('drop', onDrop);
});
</script>

<template>
  <main class="app-shell" :class="{ 'drag-active': isDragOver }">
    <header class="app-header">
      <div class="brand-block">
        <img src="./assets/icon.png" alt="LogViewer Pro" class="brand-icon" />
        <div>
          <h1>{{ t('app.header.title') }}</h1>
          <p>{{ t('app.header.subtitle') }}</p>
        </div>
      </div>
      <div class="header-actions">
        <button type="button" class="primary" @click="handleQuickOpenClick">
          {{ t('app.header.actions.quickOpen') }}
        </button>
        <button type="button" @click="pingMainProcess">
          {{ t('app.header.actions.retryHandshake') }}
        </button>
        <p>{{ t('app.header.handshakeLabel') }} {{ handshakeDisplay }}</p>
        <label class="language-switcher">
          <span>{{ t('app.header.languageLabel') }}</span>
          <select :value="currentLanguage" @change="handleLanguageChange">
            <option v-for="option in languageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>
    </header>

    <nav class="main-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="['nav-item', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span class="nav-label">{{ tab.label }}</span>
        <small>{{ tab.description }}</small>
      </button>
    </nav>

    <section v-if="activeTab === 'logs'" class="panel logs-panel">
      <div class="panel-header logs-header">
        <div class="status-cards">
          <div class="status-badge" :class="{ active: isIndexing }">
            <span class="badge-label">{{ t('app.index.phase.label') }}</span>
            <span class="badge-value">{{ progressPhaseLabel }}</span>
          </div>
          <div v-if="isIndexing" class="status-badge progress">
            <span class="badge-label">{{ t('app.index.progress.label') }}</span>
            <span class="badge-value">{{ progressValue }}%</span>
            <div class="mini-progress">
              <div class="mini-progress-bar" :style="{ width: progressValue + '%' }" />
            </div>
          </div>
          <div class="status-badge file">
            <span class="badge-label">{{ t('app.logsPanel.fileLabel') }}</span>
            <span class="badge-value">{{ currentFileDisplay }}</span>
          </div>
        </div>
        <div class="panel-actions">
          <button type="button" class="primary" @click="handleQuickOpenClick">
            {{ t('app.logsPanel.buttons.chooseFile') }}
          </button>
          <button type="button" :disabled="isIndexing" @click="refreshCacheSummary">
            {{ t('app.logsPanel.buttons.refreshCache') }}
          </button>
        </div>
      </div>
      <LogViewer />
    </section>

    <section v-else-if="activeTab === 'templates'" class="panel templates-panel">
      <TemplateManager />
    </section>

    <section v-else-if="activeTab === 'status'" class="panel status-panel">
      <div class="status-grid">
        <section class="status-card">
          <h2>{{ t('app.status.overviewTitle') }}</h2>
          <p>{{ t('app.status.templateCount', { count: templateCount }) }}</p>
          <p>{{ t('app.status.lastFile', { file: currentFileDisplay }) }}</p>
          <p>{{ statusOverviewText }}</p>
          <p>{{ t('app.status.menuInvoke', { count: menuInvokeCount }) }}</p>
          <p>{{ t('app.status.latestError', { message: latestAppError ?? t('app.state.noError') }) }}</p>
          <div v-if="errorHistory.length > 0" class="error-board">
            <h3>{{ t('app.status.historyTitle') }}</h3>
            <ul>
              <li v-for="item in errorHistory" :key="item.timestamp">
                <strong>{{ item.timestamp }}</strong> - {{ item.title }} · {{ item.message }}
              </li>
            </ul>
          </div>
          <p v-if="dragError" class="drag-error">{{ dragError }}</p>
        </section>

        <section class="status-card">
          <div class="card-title">
            <h2>{{ t('app.cache.title') }}</h2>
            <span class="status-chip" :class="{ active: isIndexing }">
              {{ isIndexing ? t('app.cache.chipActive') : t('app.cache.chipIdle') }}
            </span>
          </div>
          <div class="cache-box">
            <div>
              <p>
                {{
                  t('app.cache.occupancy', {
                    size: cacheSummary ? formatBytes(cacheSummary.totalSize) : t('app.cache.noStats')
                  })
                }}
              </p>
              <small>
                {{
                  t('app.cache.entries', {
                    count: cacheSummary ? cacheSummary.entries.length : 0
                  })
                }}
              </small>
              <small class="cache-path">
                {{ t('app.cache.dirLabel', { path: cacheDirPath }) }}
              </small>
            </div>
            <div class="cache-actions">
              <button type="button" :disabled="cacheInfoLoading" @click="refreshCacheSummary">
                {{ cacheInfoLoading ? t('app.cache.refreshing') : t('app.cache.refresh') }}
              </button>
              <button type="button" @click="openCacheDir">{{ t('app.cache.openDir') }}</button>
              <button type="button" class="danger" :disabled="clearingCache" @click="clearCache">
                {{ clearingCache ? t('app.cache.clearing') : t('app.cache.clear') }}
              </button>
            </div>
          </div>
          <ul v-if="cacheEntriesView.length" class="cache-entry-list">
            <li v-for="entry in cacheEntriesView" :key="entry.cacheKey">
              <div class="cache-entry-meta">
                <strong>{{ entry.templateName || t('app.recent.unnamedTemplate') }}</strong>
                <span>{{ entry.displaySize }} · {{ entry.displayUpdatedAt }}</span>
                <small>{{ entry.filePath }}</small>
              </div>
              <div class="cache-entry-stats">
                <span>{{ entry.statsLabel }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-text">{{ t('app.cache.empty') }}</p>

          <div v-if="isIndexing" class="progress-box">
            <div class="progress-header">
              <span>{{ cacheProgressText }}</span>
              <button type="button" :disabled="isCancelling" @click="cancelIndexing">
                {{ isCancelling ? t('app.cache.cancelling') : t('app.cache.cancel') }}
              </button>
            </div>
            <progress :value="progressValue" max="100" />
          </div>
          <div
            v-else-if="
              lastIndexStats.inserted !== undefined || lastIndexStats.skipped !== undefined
            "
            class="stats-box"
          >
            <p>
              {{
                t('app.cache.stats', {
                  inserted: lastIndexStats.inserted ?? 0,
                  skipped: lastIndexStats.skipped ?? 0
                })
              }}
            </p>
            <div v-if="lastIndexStats.unmatched?.length" class="unmatched-box">
              <p>{{ t('app.cache.unmatchedHint') }}</p>
              <ul>
                <li v-for="(line, index) in lastIndexStats.unmatched" :key="index">
                  {{ line }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="status-card">
          <h2>{{ t('app.recent.title') }}</h2>
          <p v-if="recentItemsView.length === 0" class="empty-text">
            {{ t('app.recent.empty') }}
          </p>
          <ul v-else class="recent-list">
            <li v-for="item in recentItemsView" :key="item.filePath" class="recent-item">
              <div class="recent-meta">
                <div class="recent-title">
                  <strong>{{ item.displayName }}</strong>
                  <span v-if="item.missingTemplate" class="badge">
                    {{ t('app.recent.badgeMissingTemplate') }}
                  </span>
                </div>
                <span class="recent-time">
                  {{
                    t('app.recent.lastOpened', {
                      absolute: item.openedAtAbsolute,
                      relative: item.openedAtRelative
                    })
                  }}
                </span>
                <small>{{ item.filePath }}</small>
              </div>
              <div class="recent-actions">
                <button type="button" @click="reopenRecent(item)">
                  {{ t('app.recent.reopen') }}
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </section>

    <section v-else-if="activeTab === 'systemLog'" class="panel system-log-panel">
      <SystemLogPanel />
    </section>

    <section v-else-if="activeTab === 'help'" class="panel help-panel">
      <HelpCenter />
    </section>

    <section v-else class="panel preferences-panel">
      <UserPreferencesPanel />
    </section>

    <div v-if="isDragOver" class="drag-overlay">
      <p>{{ t('app.dragOverlay') }}</p>
    </div>
  </main>
</template>




<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--app-shell-bg);
  color: var(--text-color);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.app-shell.drag-active {
  outline: 3px dashed rgba(63, 140, 255, 0.6);
  outline-offset: -8px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  gap: 16px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--panel-border);
  background: var(--surface-color);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 48px;
  height: 48px;
}

.brand-block h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-block p {
  margin: 3px 0 0;
  color: var(--muted-text);
  font-size: 12px;
}

.header-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.header-actions button {
  border: 1px solid var(--control-border);
  border-radius: 6px;
  padding: 6px 12px;
  background-color: var(--control-bg);
  color: var(--text-color);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.header-actions button:hover {
  background-color: color-mix(in srgb, var(--text-color) 8%, var(--control-bg));
}

.header-actions p {
  margin: 0;
  font-size: 11px;
  color: var(--muted-text);
  white-space: nowrap;
}

.language-switcher {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--muted-text);
}

.language-switcher select {
  border-radius: 6px;
  border: 1px solid var(--control-border);
  padding: 4px 24px 4px 8px;
  background-color: var(--control-bg);
  color: var(--text-color);
  min-width: 100px;
  font-size: 11px;
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--muted-text) 50%),
    linear-gradient(135deg, var(--muted-text) 50%, transparent 50%);
  background-position:
    calc(100% - 12px) calc(50% - 2px),
    calc(100% - 8px) calc(50% - 2px);
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
  transition: all 0.2s ease;
}

.language-switcher select:hover {
  border-color: var(--accent-color);
}

.language-switcher select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 25%, transparent);
}

.primary {
  background-color: var(--accent-color) !important;
  color: var(--accent-contrast) !important;
  border-color: var(--accent-color) !important;
}

.primary:hover {
  background-color: color-mix(in srgb, var(--accent-color) 90%, black) !important;
}

.main-nav {
  display: flex;
  gap: 0;
  padding: 0 24px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--panel-border);
  background: var(--surface-color);
}

.nav-item {
  position: relative;
  border: none;
  border-radius: 0;
  padding: 12px 18px;
  background: transparent;
  color: var(--muted-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.nav-item:hover {
  color: var(--text-color);
  background: color-mix(in srgb, var(--text-color) 4%, transparent);
}

.nav-item.active {
  color: var(--accent-color);
  background: transparent;
  border-bottom-color: var(--accent-color);
}

.nav-item .nav-label {
  display: block;
  font-weight: 600;
  font-size: 13px;
}

.nav-item small {
  display: block;
  margin-top: 2px;
  color: var(--muted-text);
  font-size: 10px;
  font-weight: 400;
}

.panel {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  color: var(--text-color);
}

.logs-panel {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.help-panel {
  padding: 0;
  background: transparent;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 24px;
  background: var(--surface-color);
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.logs-header {
  align-items: center;
}

.status-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.status-badge {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  min-width: 140px;
  transition: all 0.2s ease;
}

.status-badge.active {
  background: color-mix(in srgb, var(--accent-color) 15%, var(--panel-bg));
  border-color: var(--accent-color);
}

.status-badge.progress {
  background: color-mix(in srgb, #4fc3f7 15%, var(--panel-bg));
  border-color: #4fc3f7;
}

.status-badge.file {
  flex: 1;
  min-width: 200px;
}

.badge-label {
  font-size: 10px;
  color: var(--muted-text);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.badge-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-progress {
  height: 4px;
  background: color-mix(in srgb, var(--text-color) 10%, transparent);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}

.mini-progress-bar {
  height: 100%;
  background: #4fc3f7;
  transition: width 0.3s ease;
  border-radius: 2px;
}

.panel-header h2 {
  margin: 0 0 4px;
  font-size: 1.15rem;
  font-weight: 600;
}

.panel-header p {
  margin: 2px 0 0;
  color: var(--muted-text);
  font-size: 12px;
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.panel-actions button {
  border: 1px solid var(--control-border);
  border-radius: 6px;
  padding: 6px 12px;
  background: var(--control-bg);
  color: var(--text-color);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.panel-actions button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-color) 8%, var(--control-bg));
  transform: translateY(-1px);
}

.panel-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}

.status-card {
  background-color: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 18px;
  min-height: 240px;
  color: var(--text-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.status-card h2 {
  margin: 0 0 12px;
  font-size: 1.1rem;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.status-chip {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  background-color: rgba(255, 255, 255, 0.12);
}

.status-chip.active {
  background-color: rgba(79, 195, 247, 0.4);
}

.cache-box {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background-color: var(--panel-bg);
}

.cache-box p {
  margin: 0;
}

.cache-box small {
  color: var(--muted-text);
}

.cache-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cache-actions button {
  border: 1px solid var(--control-border);
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
  background-color: var(--control-bg);
  color: var(--text-color);
  font-size: 11px;
}

.cache-actions .danger {
  background-color: #ef5350;
  color: #fff;
}

.cache-entry-list,
.recent-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cache-entry-list li,
.recent-item {
  padding: 11px;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background-color: var(--panel-bg);
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.cache-entry-meta small,
.recent-meta small {
  display: block;
  color: var(--muted-text);
  margin-top: 4px;
  word-break: break-all;
  font-size: 11px;
}

.cache-entry-stats span {
  font-size: 12px;
  color: var(--muted-text);
}

.progress-box,
.stats-box {
  margin-top: 14px;
  padding: 11px;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background-color: var(--panel-bg);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-header button {
  border: none;
  border-radius: 5px;
  padding: 5px 11px;
  background-color: #ef5350;
  color: #fff;
  cursor: pointer;
  font-size: 11px;
}

progress {
  width: 100%;
  height: 10px;
}

.unmatched-box ul,
.error-board ul {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 12px;
}

.error-board {
  margin-top: 12px;
  padding: 11px;
  border-radius: 10px;
  background-color: rgba(255, 82, 82, 0.12);
  border: 1px solid rgba(255, 82, 82, 0.35);
}

.drag-error,
.empty-text {
  color: var(--muted-text);
  margin-top: 12px;
  font-size: 12px;
}

.recent-meta {
  flex: 1;
}

.recent-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recent-time {
  display: block;
  font-size: 12px;
  color: var(--muted-text);
  margin-top: 3px;
}

.recent-actions button {
  border: none;
  border-radius: 6px;
  padding: 5px 11px;
  background-color: var(--accent-color);
  color: var(--accent-contrast);
  cursor: pointer;
  font-size: 11px;
}

.badge {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  background-color: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.drag-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--text-color);
  z-index: 1000;
  pointer-events: none;
}

@media (max-width: 1100px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .main-nav {
    overflow-x: auto;
    flex-wrap: nowrap;
  }

  .nav-item {
    flex-shrink: 0;
  }
}
</style>
