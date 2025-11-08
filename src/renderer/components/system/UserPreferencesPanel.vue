<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePreferenceStore } from '../../stores/preferenceStore';

const preferenceStore = usePreferenceStore();
const { resolved, loading, saving, error } = storeToRefs(preferenceStore);

const theme = computed(() => resolved.value.theme);
const rememberWindowState = computed(() => resolved.value.rememberWindowState);
const defaultQueryLimit = computed(() => resolved.value.defaultQueryLimit);

const handleThemeChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as 'dark' | 'light' | 'system';
  void preferenceStore.updatePreferences({ theme: value });
};

const handleLimitChange = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isNaN(value)) return;
  const normalized = Math.max(50, Math.min(value, 1000));
  void preferenceStore.updatePreferences({ defaultQueryLimit: normalized });
};

const handleRememberToggle = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  void preferenceStore.updatePreferences({ rememberWindowState: checked });
};
</script>

<template>
  <section class="user-preferences-panel">
    <header>
      <h2>用户偏好</h2>
      <p>调整默认查询条数、主题以及窗口记忆策略，所有修改即时生效并自动保存。</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="form-grid">
      <label>
        UI 主题
        <select :value="theme" :disabled="loading || saving" @change="handleThemeChange">
          <option value="dark">深色</option>
          <option value="light">浅色</option>
          <option value="system">跟随系统</option>
        </select>
      </label>
      <label>
        默认查询条数
        <input
          type="number"
          :value="defaultQueryLimit"
          min="50"
          max="1000"
          step="50"
          :disabled="saving"
          @change="handleLimitChange"
        />
      </label>
      <label class="toggle">
        <input
          type="checkbox"
          :checked="rememberWindowState"
          :disabled="saving"
          @change="handleRememberToggle"
        />
        记住上次窗口尺寸
      </label>
    </div>
    <small class="hint">最后更新：{{ new Date(resolved.lastUpdatedAt).toLocaleString() }}</small>
  </section>
</template>

<style scoped>
.user-preferences-panel {
  margin-top: 24px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(255, 255, 255, 0.03);
}

header h2 {
  margin: 0;
}

header p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.7);
}

.form-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

select,
input[type='number'] {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.35);
  color: #fff;
}

.toggle {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.error {
  color: #ff8a80;
  margin-top: 8px;
}

.hint {
  display: block;
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
