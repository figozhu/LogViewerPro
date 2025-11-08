<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import TemplateManager from './components/templates/TemplateManager.vue';
import LogViewer from './components/logs/LogViewer.vue';
import SystemLogPanel from './components/system/SystemLogPanel.vue';
import UserPreferencesPanel from './components/system/UserPreferencesPanel.vue';
import type { IndexCompleteEvent, IndexProgressEvent } from '@shared/models/indexing';
import { useTemplateStore } from './stores/templateStore';
import { useLogsStore } from './stores/logsStore';
import { promptTemplateSelection, type TemplateSelectionResult } from './modules/templateSelection';
import type { CacheSummary } from '@shared/models/cache';
import { usePreferenceStore } from './stores/preferenceStore';

const handshakeTime = ref('尚未连接');
const menuInvokeCount = ref(0);
const lastOpenedFile = ref('尚未选择');
const indexingMessage = ref('等待任务');
const progressPhase = ref('无');
const progressValue = ref(0);
const currentJobId = ref<string | null>(null);
const latestAppError = ref('暂无错误');
const errorHistory = ref<Array<{ title: string; message: string; timestamp: string }>>([]);
const isDragOver = ref(false);
const dragError = ref('');
const cacheSummary = ref<CacheSummary | null>(null);
const cacheInfoLoading = ref(false);
const clearingCache = ref(false);
const isCancelling = ref(false);
const isIndexing = computed(() => currentJobId.value !== null);
const lastIndexStats = ref<{ inserted?: number; skipped?: number; unmatched?: string[] }>({});

let disposeMenuListener: (() => void) | null = null;
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

/**
 * 以更新时间倒序展示缓存条目列表，供 UI 快速浏览最近的索引产物。
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

const cacheDirPath = computed(() => cacheSummary.value?.cacheDir ?? '缓存目录尚未生成');

/**
 * 最近打开列表的展示模型，附带时间描述与模板可用性标记。
 */
const recentItemsView = computed(() => {
  const templateMap = new Map(templates.value.map((tpl) => [tpl.id, tpl]));
  return recentItems.value.map((item) => {
    const template = templateMap.get(item.templateId);
    const displayName = template?.name ?? item.templateName ?? '未命名模板';
    return {
      ...item,
      displayName,
      openedAtAbsolute: item.openedAt ? formatDateTime(item.openedAt) : '时间未知',
      openedAtRelative: item.openedAt ? formatRelativeTime(item.openedAt) : '时间未知',
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
  latestAppError.value = `${title}：${message}`;
  appendErrorHistory(title, message);
};

const pingMainProcess = async () => {
  try {
    const response = await window.logViewerApi.notifyReady();
    handshakeTime.value = new Date(response.timestamp).toLocaleString();
  } catch (error) {
    reportError('IPC 握手失败', error);
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
    await window.logViewerApi.validateFile(filePath);
    const selection = await selectTemplate(preferredTemplateId);
    if (!selection) return;

    lastOpenedFile.value = filePath;
    await templateStore.saveRecent(filePath, selection.templateId, selection.templateName);
    progressPhase.value = '准备中';
    progressValue.value = 0;
    lastIndexStats.value = {};
    const { jobId, cacheUsed } = await window.logViewerApi.startIndexing({
      filePath,
      templateId: selection.templateId
    });
    if (cacheUsed) {
      currentJobId.value = null;
      progressPhase.value = '命中缓存';
      progressValue.value = 100;
      indexingMessage.value = '命中缓存，已完成加载';
      void logsStore.setActiveFile(filePath);
      void refreshCacheSummary();
    } else {
      currentJobId.value = jobId;
      indexingMessage.value = `索引任务 ${jobId} 已启动`;
    }
  } catch (error) {
    dragError.value = formatError(error);
    reportError('文件打开失败', error);
  }
};

const handleMenuOpen = async () => {
  menuInvokeCount.value += 1;
  const result = await window.logViewerApi.openLogFileDialog();
  if (result.canceled || result.filePaths.length === 0) return;
  await handleExternalFileOpen(result.filePaths[0]);
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
    indexingMessage.value = '索引任务已取消';
  } else if (payload.cacheUsed) {
    indexingMessage.value = '命中缓存，已瞬时加载';
  } else {
    indexingMessage.value = '索引完成';
  }
  progressPhase.value = payload.cancelled ? '已取消' : '完成';
  progressValue.value = payload.cancelled ? progressValue.value : 100;
  currentJobId.value = null;
  if (!payload.cancelled && lastOpenedFile.value && lastOpenedFile.value !== '尚未选择') {
    void logsStore.setActiveFile(lastOpenedFile.value);
  }
  void refreshCacheSummary();
};

const handleAppError = (payload: { title: string; message: string }) => {
  latestAppError.value = `${payload.title}：${payload.message}`;
  appendErrorHistory(payload.title, payload.message);
};

const reopenRecent = async (item: { filePath: string; templateId: string }) => {
  await handleExternalFileOpen(item.filePath, item.templateId);
};

/**
 * 主动拉取缓存汇总信息，配合索引流程保持 UI 与磁盘状态一致。
 */
const refreshCacheSummary = async () => {
  cacheInfoLoading.value = true;
  try {
    cacheSummary.value = await window.logViewerApi.getCacheSummary();
  } finally {
    cacheInfoLoading.value = false;
  }
};

const clearCache = async () => {
  clearingCache.value = true;
  try {
    cacheSummary.value = await window.logViewerApi.clearCache();
  } finally {
    clearingCache.value = false;
  }
};

const openCacheDir = async () => {
  try {
    await window.logViewerApi.openCacheDir();
  } catch (error) {
    reportError('打开缓存目录失败', error);
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
    dragError.value = '未检测到拖拽的文件';
    return;
  }
  const file = files[0] as File & { path?: string };
  const filePath = file.path;
  if (!filePath) {
    dragError.value = '无法读取文件路径';
    return;
  }
  void handleExternalFileOpen(filePath);
};

/**
 * 根据缓存统计生成可读文本，方便在列表中展示写入/跳过数量。
 */
const formatCacheStats = (inserted?: number, skipped?: number): string => {
  const insertedText = inserted !== undefined ? inserted : '—';
  const skippedText = skipped !== undefined ? skipped : '—';
  return `写入 ${insertedText} · 跳过 ${skippedText}`;
};

/**
 * 将字节数转换为可读字符串（KB/MB/GB），用于缓存占用展示。
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
 * 将时间戳格式化为本地时间字符串，统一 UI 展示格式。
 */
const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return '时间未知';
  return new Date(timestamp).toLocaleString();
};

/**
 * 计算相对时间（几分钟前/几小时前），用于最近列表提示。
 */
const formatRelativeTime = (timestamp: number): string => {
  if (!timestamp) return '时间未知';
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < day * 7) return `${Math.floor(diff / day)} 天前`;
  return formatDateTime(timestamp);
};

const cancelIndexing = async () => {
  if (!currentJobId.value) {
    return;
  }
  isCancelling.value = true;
  try {
    await window.logViewerApi.cancelIndex(currentJobId.value);
  } catch (error) {
    reportError('取消任务失败', error);
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
    })
    .catch(() => {
      applyThemePreference();
    });
  void refreshCacheSummary();
  disposeMenuListener = window.logViewerApi.onMenuOpenFile(() => {
    void handleMenuOpen();
  });
  disposeProgressListener = window.logViewerApi.onIndexProgress(handleIndexProgress);
  disposeCompleteListener = window.logViewerApi.onIndexComplete(handleIndexComplete);
  disposeAppErrorListener = window.logViewerApi.onAppError(handleAppError);
  disposeIndexErrorListener = window.logViewerApi.onIndexError((payload) => {
    reportError('索引错误', payload.message);
  });
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);
});

onBeforeUnmount(() => {
  disposeMenuListener?.();
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
      <div>
        <h1>LogViewer Pro</h1>
        <p>跨平台 GB 级日志分析</p>
      </div>
      <div class="header-actions">
        <button type="button" @click="pingMainProcess">重新握手</button>
        <p>最近握手：{{ handshakeTime }}</p>
      </div>
    </header>

    <section class="status-grid">
      <section class="status-card">
        <h2>系统状态</h2>
        <p>模板数量：{{ templateCount }} 个</p>
        <p>最近文件：{{ lastOpenedFile }}</p>
        <p>
          索引状态：{{ indexingMessage }} · 阶段：{{ progressPhase }} · 进度：{{ progressValue }}%
        </p>
        <p>菜单触发：{{ menuInvokeCount }} 次</p>
        <p>最新错误：{{ latestAppError }}</p>
        <div v-if="errorHistory.length > 0" class="error-board">
          <h3>错误记录</h3>
          <ul>
            <li v-for="item in errorHistory" :key="item.timestamp">
              <strong>{{ item.timestamp }}</strong> - {{ item.title }}：{{ item.message }}
            </li>
          </ul>
        </div>
        <p v-if="dragError" class="drag-error">{{ dragError }}</p>
      </section>

      <section class="status-card">
        <div class="card-title">
          <h2>索引与缓存</h2>
          <span class="status-chip" :class="{ active: isIndexing }">
            {{ isIndexing ? '索引中' : '已空闲' }}
          </span>
        </div>
        <div class="cache-box">
          <div>
            <p>缓存占用：{{ cacheSummary ? formatBytes(cacheSummary.totalSize) : '尚未统计' }}</p>
            <small>缓存条目：{{ cacheSummary ? cacheSummary.entries.length : 0 }}</small>
            <small class="cache-path">目录：{{ cacheDirPath }}</small>
          </div>
          <div class="cache-actions">
            <button type="button" :disabled="cacheInfoLoading" @click="refreshCacheSummary">
              {{ cacheInfoLoading ? '刷新中...' : '刷新' }}
            </button>
            <button type="button" @click="openCacheDir">打开目录</button>
            <button type="button" class="danger" :disabled="clearingCache" @click="clearCache">
              {{ clearingCache ? '清理中...' : '清除缓存' }}
            </button>
          </div>
        </div>
        <ul v-if="cacheEntriesView.length" class="cache-entry-list">
          <li v-for="entry in cacheEntriesView" :key="entry.cacheKey">
            <div class="cache-entry-meta">
              <strong>{{ entry.templateName || '未命名模板' }}</strong>
              <span>{{ entry.displaySize }} · {{ entry.displayUpdatedAt }}</span>
              <small>{{ entry.filePath }}</small>
            </div>
            <div class="cache-entry-stats">
              <span>{{ entry.statsLabel }}</span>
            </div>
          </li>
        </ul>
        <p v-else class="empty-text">暂无缓存，首个索引完成后会自动生成。</p>

        <div v-if="isIndexing" class="progress-box">
          <div class="progress-header">
            <span>索引进度：{{ progressPhase }} ({{ progressValue }}%)</span>
            <button type="button" :disabled="isCancelling" @click="cancelIndexing">
              {{ isCancelling ? '取消中...' : '取消任务' }}
            </button>
          </div>
          <progress :value="progressValue" max="100" />
        </div>
        <div
          v-else-if="lastIndexStats.inserted !== undefined || lastIndexStats.skipped !== undefined"
          class="stats-box"
        >
          <p>
            写入行数：{{ lastIndexStats.inserted ?? 0 }}；未匹配行：{{
              lastIndexStats.skipped ?? 0
            }}
          </p>
          <div v-if="lastIndexStats.unmatched?.length" class="unmatched-box">
            <p>未匹配示例（最多 5 行）</p>
            <ul>
              <li v-for="(line, index) in lastIndexStats.unmatched" :key="index">{{ line }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="status-card">
        <h2>最近记录</h2>
        <p v-if="recentItemsView.length === 0" class="empty-text">暂无最近打开记录。</p>
        <ul v-else class="recent-list">
          <li v-for="item in recentItemsView" :key="item.filePath" class="recent-item">
            <div class="recent-meta">
              <div class="recent-title">
                <strong>{{ item.displayName }}</strong>
                <span v-if="item.missingTemplate" class="badge">模板已删除</span>
              </div>
              <span class="recent-time"
                >上次打开：{{ item.openedAtAbsolute }}（{{ item.openedAtRelative }}）</span
              >
              <small>{{ item.filePath }}</small>
            </div>
            <div class="recent-actions">
              <button type="button" @click="reopenRecent(item)">重新打开</button>
            </div>
          </li>
        </ul>
      </section>
    </section>

    <div class="workspace">
      <section class="panel templates-panel">
        <TemplateManager />
      </section>
      <section class="panel logs-panel">
        <LogViewer />
      </section>
    </div>

    <UserPreferencesPanel />
    <SystemLogPanel />

    <div v-if="isDragOver" class="drag-overlay">
      <p>释放文件以开始解析</p>
    </div>
  </main>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 32px;
  background: radial-gradient(circle at top, #1a2337 0%, #0b0d15 55%, #05060b 100%);
  color: #f7f7fb;
}

.app-shell.drag-active {
  border: 2px dashed rgba(111, 177, 255, 0.8);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.app-header h1 {
  margin: 0;
  font-size: 2rem;
}

.app-header p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  text-align: right;
}

.header-actions button {
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  background-color: #3f8cff;
  color: #fff;
  cursor: pointer;
  margin-bottom: 4px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.status-card {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  min-height: 220px;
}

.status-card h2 {
  margin: 0 0 12px;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.status-chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  background-color: rgba(255, 255, 255, 0.12);
}

.status-chip.active {
  background-color: rgba(79, 195, 247, 0.3);
}

.cache-box {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(255, 255, 255, 0.02);
}

.cache-box p {
  margin: 0;
}

.cache-box small {
  color: rgba(255, 255, 255, 0.6);
}

.cache-actions {
  display: flex;
  gap: 8px;
}

.cache-actions button {
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  background-color: #455a64;
  color: #fff;
}

.cache-actions .danger {
  background-color: #ef5350;
}

.cache-entry-list,
.recent-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cache-entry-list li,
.recent-item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(0, 0, 0, 0.24);
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.cache-entry-meta small,
.recent-meta small {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
  word-break: break-all;
}

.cache-entry-stats span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.progress-box,
.stats-box {
  margin-top: 16px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(0, 0, 0, 0.2);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-header button {
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  background-color: #ef5350;
  color: #fff;
  cursor: pointer;
}

progress {
  width: 100%;
  height: 12px;
}

.unmatched-box ul,
.error-board ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

.error-board {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background-color: rgba(255, 82, 82, 0.15);
  border: 1px solid rgba(255, 82, 82, 0.3);
}

.drag-error,
.empty-text {
  color: rgba(255, 255, 255, 0.7);
  margin-top: 12px;
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
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 4px;
}

.recent-actions button {
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  background-color: #3f8cff;
  color: #fff;
  cursor: pointer;
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background-color: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.workspace {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
}

.panel {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
}

.drag-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #ffffff;
  z-index: 1000;
  pointer-events: none;
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
