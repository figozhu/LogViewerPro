<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useSystemLogStore } from '../../stores/systemLogStore';

const logStore = useSystemLogStore();
const { logs, loading, error, limit } = storeToRefs(logStore);

const refreshLogs = () => {
  void logStore.fetchRecent();
};

const handleLimitChange = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isNaN(value)) return;
  void logStore.setLimit(value);
};

onMounted(() => {
  void logStore.fetchRecent();
});
</script>

<template>
  <section class="system-log-panel">
    <header>
      <div>
        <h2>系统日志</h2>
        <p>展示主进程/Worker/Renderer 统一写入的 app.log，便于快速排查。</p>
      </div>
      <div class="actions">
        <label>
          保留行数
          <input
            type="number"
            :value="limit"
            min="50"
            max="1000"
            step="50"
            @change="handleLimitChange"
          />
        </label>
        <button type="button" :disabled="loading" @click="refreshLogs">
          {{ loading ? '刷新中...' : '刷新日志' }}
        </button>
      </div>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="log-list">
      <article v-for="(log, index) in logs" :key="index" class="log-item" :data-level="log.level">
        <div class="meta">
          <span class="timestamp">{{ log.timestamp }}</span>
          <span class="level">{{ log.level }}</span>
        </div>
        <pre>{{ log.message }}</pre>
      </article>
      <p v-if="!logs.length && !loading" class="empty-text">暂无日志，请稍后刷新。</p>
    </div>
  </section>
</template>

<style scoped>
.system-log-panel {
  margin-top: 24px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(0, 0, 0, 0.2);
}

header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

header h2 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

label {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

input {
  margin-top: 4px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  width: 100px;
}

button {
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  background-color: #3f8cff;
  color: #fff;
  cursor: pointer;
}

.log-list {
  margin-top: 16px;
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(255, 255, 255, 0.02);
  font-size: 13px;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.7);
}

.log-item[data-level='ERROR'] {
  border-color: rgba(255, 99, 132, 0.4);
}

.log-item[data-level='WARN'] {
  border-color: rgba(255, 193, 7, 0.4);
}

.log-item[data-level='INFO'] {
  border-color: rgba(79, 195, 247, 0.4);
}

.log-item pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Consolas, 'SFMono-Regular', 'Courier New', monospace;
}

.error {
  color: #ff8a80;
  margin-top: 12px;
}

.empty-text {
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin: 0;
}

@media (max-width: 720px) {
  header {
    flex-direction: column;
  }
  .actions {
    flex-direction: column;
    align-items: flex-start;
  }
  input {
    width: 100%;
  }
}
</style>
