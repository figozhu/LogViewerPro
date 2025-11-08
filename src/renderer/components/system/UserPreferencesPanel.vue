<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { usePreferenceStore } from '../../stores/preferenceStore';

const preferenceStore = usePreferenceStore();
const { resolved, loading, saving, error } = storeToRefs(preferenceStore);
const { t } = useI18n();

const theme = computed(() => resolved.value.theme);
const rememberWindowState = computed(() => resolved.value.rememberWindowState);
const defaultQueryLimit = computed(() => resolved.value.defaultQueryLimit);
const language = computed(() => resolved.value.language);

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

const handleLanguageChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as 'auto' | 'zh-CN' | 'en-US';
  void preferenceStore.updatePreferences({ language: value });
};
</script>

<template>
  <section class="user-preferences-panel">
    <header>
      <h2>{{ t('preferences.title') }}</h2>
      <p>{{ t('preferences.description') }}</p>
    </header>
    <p v-if="error" class="error">{{ error || t('preferences.error') }}</p>
    <div class="form-grid">
      <label>
        {{ t('preferences.themeLabel') }}
        <select :value="theme" :disabled="loading || saving" @change="handleThemeChange">
          <option value="dark">{{ t('preferences.themes.dark') }}</option>
          <option value="light">{{ t('preferences.themes.light') }}</option>
          <option value="system">{{ t('preferences.themes.system') }}</option>
        </select>
      </label>
      <label>
        {{ t('preferences.defaultLimitLabel') }}
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
      <label>
        {{ t('preferences.languageLabel') }}
        <select :value="language" :disabled="saving" @change="handleLanguageChange">
          <option value="auto">{{ t('preferences.languages.auto') }}</option>
          <option value="zh-CN">{{ t('preferences.languages.zhCN') }}</option>
          <option value="en-US">{{ t('preferences.languages.enUS') }}</option>
        </select>
      </label>
      <label class="toggle">
        <input
          type="checkbox"
          :checked="rememberWindowState"
          :disabled="saving"
          @change="handleRememberToggle"
        />
        {{ t('preferences.rememberLabel') }}
      </label>
    </div>
    <small class="hint">
      {{
        t('preferences.updatedAt', {
          time: new Date(resolved.lastUpdatedAt).toLocaleString()
        })
      }}
    </small>
  </section>
</template>

<style scoped>
.user-preferences-panel {
  margin-top: 24px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--panel-border);
  background-color: var(--panel-bg);
  color: var(--text-color);
}

header h2 {
  margin: 0;
}

header p {
  margin: 4px 0 0;
  color: var(--muted-text);
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
  border: 1px solid var(--control-border);
  padding: 8px 36px 8px 12px;
  background-color: var(--control-bg);
  color: var(--text-color);
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--muted-text) 50%),
    linear-gradient(135deg, var(--muted-text) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 2px),
    calc(100% - 12px) calc(50% - 2px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

select:focus,
input[type='number']:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 45%, transparent);
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
  color: var(--muted-text);
}
</style>
