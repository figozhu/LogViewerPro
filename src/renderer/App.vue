<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import TemplateManager from './components/templates/TemplateManager.vue';
import LogViewer from './components/logs/LogViewer.vue';
import type { IndexCompleteEvent, IndexProgressEvent } from '@shared/models/indexing';
import { useTemplateStore } from './stores/templateStore';
import { useLogsStore } from './stores/logsStore';
import { promptTemplateSelection, type TemplateSelectionResult } from './modules/templateSelection';
import type { CacheSummary } from '@shared/models/cache';

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
const { templates, recentItems } = storeToRefs(templateStore);
const templateCount = computed(() => templates.value.length);

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
};

const handleAppError = (payload: { title: string; message: string }) => {
  latestAppError.value = `${payload.title}：${payload.message}`;
  appendErrorHistory(payload.title, payload.message);
};

const reopenRecent = async (item: { filePath: string; templateId: string }) => {
  await handleExternalFileOpen(item.filePath, item.templateId);
};

const refreshCacheSummary = async () => {
  cacheSummary.value = await window.logViewerApi.getCacheSummary();
};

const clearCache = async () => {
  clearingCache.value = true;
  try {
    cacheSummary.value = await window.logViewerApi.clearCache();
  } finally {
    clearingCache.value = false;
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
        <h2>运行状态</h2>
        <p>模板数量：{{ templateCount }} 个</p>
        <p>最新选择的日志文件：{{ lastOpenedFile }}</p>
        <p>
          索引状态：{{ indexingMessage }} ｜ 阶段：{{ progressPhase }} ｜ 进度：{{ progressValue }}%
        </p>
        <p>今日菜单打开：{{ menuInvokeCount }} 次</p>
        <p>最近错误：{{ latestAppError }}</p>
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
        <h2>索引/缓存</h2>
        <div v-if="cacheSummary" class="cache-box">
          <p>缓存大小：{{ (cacheSummary.totalSize / (1024 * 1024)).toFixed(2) }} MB</p>
          <button type="button" :disabled="clearingCache" @click="clearCache">
            {{ clearingCache ? '清理中...' : '清除所有索引缓存' }}
          </button>
          <small v-if="cacheSummary.entries.length === 0">暂无缓存</small>
        </div>
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
            <p>未匹配样本（最多 5 条）：</p>
            <ul>
              <li v-for="(line, index) in lastIndexStats.unmatched" :key="index">{{ line }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="status-card">
        <h2>最近打开</h2>
        <p v-if="recentItems.length === 0">暂无记录</p>
        <ul v-else>
          <li v-for="item in recentItems" :key="item.filePath">
            <div>
              <strong>{{ item.templateName || '未命名模板' }}</strong>
              <small>{{ item.filePath }}</small>
            </div>
            <button type="button" @click="reopenRecent(item)">重新打开</button>
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

    <div v-if="isDragOver" class="drag-overlay">
      <p>释放文件以开始解析</p>
    </div>
  </main>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 48px;
  color: #f8f8f2;
}

.hero {
  background: linear-gradient(135deg, #2c5364, #203a43, #0f2027);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.hero h1 {
  margin: 0 0 12px;
  font-size: 2.5rem;
}

.hero p {
  margin: 0 0 20px;
  line-height: 1.6;
}

.hero button {
  width: 160px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background-color: #4caf50;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}

.status {
  padding: 24px;
  background-color: #1e1e1e;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status h2 {
  margin-bottom: 8px;
}

.drag-error {
  margin-top: 12px;
  color: #ff8a80;
}

.cache-box {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.03);
  display: flex;
  align-items: center;
  gap: 12px;
}

.cache-box button {
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  background-color: #ff7043;
  color: #fff;
  cursor: pointer;
}

.cache-box small {
  color: #9e9e9e;
}

.progress-box {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.stats-box {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(255, 255, 255, 0.02);
}

.unmatched-box ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

.error-board {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 76, 76, 0.4);
  border-radius: 8px;
  background-color: rgba(255, 76, 76, 0.1);
}

.error-board ul {
  margin: 0;
  padding-left: 20px;
  max-height: 160px;
  overflow-y: auto;
}

.recent-section {
  padding: 16px 24px 32px;
  background-color: #111;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.recent-section ul {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-section li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.recent-section small {
  display: block;
  color: #9e9e9e;
  margin-top: 4px;
  max-width: 520px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-section button {
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  background-color: #2196f3;
  color: #fff;
  cursor: pointer;
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
</style>
