<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useSystemLogStore } from '../../stores/systemLogStore';

const logStore = useSystemLogStore();
const { logs, loading, error, limit } = storeToRefs(logStore);
const { t } = useI18n();

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
        <h2>{{ t('systemLog.title') }}</h2>
        <p>{{ t('systemLog.description') }}</p>
      </div>
      <div class="actions">
        <label>
          {{ t('systemLog.retainLabel') }}
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
          {{ loading ? t('systemLog.refreshing') : t('systemLog.refresh') }}
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
      <p v-if="!logs.length && !loading" class="empty-text">{{ t('systemLog.empty') }}</p>
    </div>
  </section>
</template>

<style scoped>
.system-log-panel {
  margin-top: 24px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--panel-border);
  background-color: var(--panel-bg);
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
  color: var(--muted-text);
}

input {
  margin-top: 4px;
  border-radius: 6px;
  border: 1px solid var(--control-border);
  padding: 4px 8px;
  background: var(--control-bg);
  color: var(--text-color);
  width: 100px;
}

input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 35%, transparent);
}

button {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 16px;
  background-color: var(--accent-color);
  color: var(--accent-contrast);
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
  border: 1px solid var(--panel-border);
  background-color: var(--surface-color);
  font-size: 13px;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
  color: var(--muted-text);
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
  color: var(--muted-text);
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
