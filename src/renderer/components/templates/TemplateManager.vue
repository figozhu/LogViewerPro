<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useTemplateStore } from '../../stores/templateStore';

const templateStore = useTemplateStore();
const { templates, loading, saving, currentForm, mode, errorMessage, testResults } =
  storeToRefs(templateStore);
const { t } = useI18n();

const isEditing = computed(() => mode.value === 'editing');
const isCreating = computed(() => mode.value === 'creating');

const actionTitle = computed(() => {
  if (isEditing.value) return t('templateManager.panelTitle.edit');
  if (isCreating.value) return t('templateManager.panelTitle.create');
  return t('templateManager.panelTitle.idle');
});

const handleSave = async () => {
  await templateStore.saveCurrent();
};

const handleCreate = () => {
  templateStore.startCreate();
};

const handleCancel = () => {
  templateStore.resetForm();
};

const handleDelete = async (id: string) => {
  if (confirm(t('templateManager.confirmDelete'))) {
    await templateStore.deleteTemplate(id);
  }
};

const runRegexTest = () => {
  templateStore.runRegexTest();
};

onMounted(() => {
  void templateStore.fetchAll();
});
</script>

<template>
  <div class="template-manager">
    <aside class="template-list">
      <div class="header">
        <h2>{{ t('templateManager.listTitle') }}</h2>
        <button type="button" class="primary" @click="handleCreate">
          {{ t('templateManager.createButton') }}
        </button>
      </div>
      <p v-if="loading">{{ t('templateManager.loading') }}</p>
      <ul v-else>
        <li
          v-for="template in templates"
          :key="template.id"
          :class="{ active: currentForm.id === template.id }"
        >
          <div>
            <strong>{{ template.name }}</strong>
            <small>
              {{
                t('templateManager.meta', {
                  timestamp: template.timestampField,
                  fts: template.ftsField
                })
              }}
            </small>
          </div>
          <div class="actions">
            <button type="button" @click="templateStore.startEdit(template)">
              {{ t('templateManager.edit') }}
            </button>
            <button type="button" class="danger" @click="handleDelete(template.id)">
              {{ t('templateManager.delete') }}
            </button>
          </div>
        </li>
      </ul>
    </aside>

    <section class="template-form">
      <h2>{{ actionTitle }}</h2>

      <div v-if="errorMessage" class="error-box">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSave">
        <label>
          {{ t('templateManager.form.nameLabel') }}
          <input
            v-model="currentForm.name"
            type="text"
            :placeholder="t('templateManager.form.namePlaceholder')"
            required
          />
        </label>
        <label>
          {{ t('templateManager.form.regexLabel') }}
          <textarea
            v-model="currentForm.regex"
            rows="3"
            :placeholder="t('templateManager.form.regexPlaceholder')"
            required
          />
        </label>
        <div class="inline">
          <label>
            {{ t('templateManager.form.timestampLabel') }}
            <input
              v-model="currentForm.timestampField"
              type="text"
              :placeholder="t('templateManager.form.timestampPlaceholder')"
              required
            />
          </label>
          <label>
            {{ t('templateManager.form.searchLabel') }}
            <input
              v-model="currentForm.ftsField"
              type="text"
              :placeholder="t('templateManager.form.searchPlaceholder')"
              required
            />
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" class="primary" :disabled="saving">
            {{ saving ? t('templateManager.form.saving') : t('templateManager.form.save') }}
          </button>
          <button type="button" @click="handleCancel">
            {{ t('templateManager.form.cancel') }}
          </button>
        </div>
      </form>

      <section class="regex-tester">
        <div class="tester-header">
          <h3>{{ t('templateManager.tester.title') }}</h3>
          <button type="button" class="secondary" @click="runRegexTest">
            {{ t('templateManager.tester.button') }}
          </button>
        </div>
        <textarea
          v-model="currentForm.sampleInput"
          rows="6"
          :placeholder="t('templateManager.tester.placeholder')"
        />
        <h4>{{ t('templateManager.tester.resultTitle', { count: testResults.length }) }}</h4>
        <div v-if="testResults.length" class="test-results">
          <article
            v-for="(result, index) in testResults"
            :key="index"
            :class="['test-result-item', { matched: result.matched }]"
          >
            <p>
              <strong>{{ t('templateManager.tester.logLabel') }}</strong>{{ result.line }}
            </p>
            <p v-if="!result.matched">{{ t('templateManager.tester.unmatched') }}</p>
            <div v-else class="group-grid">
              <div v-for="(value, name) in result.groups" :key="name" class="group-item">
                <span class="group-key">{{ name }}</span>
                <span class="group-value">{{ value }}</span>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="empty-text">{{ t('templateManager.tester.noResult') }}</p>
      </section>
    </section>
  </div>
</template>


<style scoped>
.template-manager {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  margin-top: 32px;
}

.template-list,
.template-form {
  background-color: var(--surface-color);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--panel-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-form {
  padding: 24px;
}

.template-list .header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-list li {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--panel-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: var(--panel-bg);
}

.template-list strong {
  display: block;
  word-break: break-word;
}

.template-list small {
  color: var(--muted-text);
}

.template-list li.active {
  border-color: var(--accent-color);
  background-color: color-mix(in srgb, var(--accent-color) 18%, transparent);
}

.template-list .actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.template-list .actions button {
  flex: 1 1 140px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.95rem;
  color: var(--muted-text);
}

label > input,
label > textarea {
  color: var(--text-color);
}

input,
textarea {
  background-color: var(--control-bg);
  color: var(--text-color);
  border-radius: 8px;
  border: 1px solid var(--control-border);
  padding: 10px;
  font-size: 0.95rem;
}

textarea {
  resize: vertical;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 35%, transparent);
}

.inline {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

button {
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.95rem;
  white-space: normal;
  line-height: 1.3;
  text-align: center;
  border: 1px solid var(--control-border);
  background-color: var(--control-bg);
  color: var(--text-color);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

button.primary {
  background-color: var(--accent-color);
  border-color: transparent;
  color: var(--accent-contrast);
}

button.secondary {
  background-color: transparent;
  color: var(--accent-color);
  border-color: var(--accent-color);
}

button.danger {
  background-color: #f44336;
  border-color: #f44336;
  color: #fff;
}

.regex-tester {
  border-top: 1px solid var(--panel-border);
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tester-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.test-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 12px;
  background-color: var(--panel-bg);
}

.test-result-item {
  padding: 8px;
  border-radius: 6px;
  border: 1px dashed var(--panel-border);
}

.test-result-item.matched {
  border-color: rgba(76, 175, 80, 0.6);
  background-color: color-mix(in srgb, #4caf50 15%, transparent);
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-top: 6px;
}

.group-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: var(--control-bg);
  padding: 6px;
  border-radius: 6px;
  border: 1px solid var(--control-border);
}

.group-key {
  font-size: 0.85rem;
  color: var(--muted-text);
}

.group-value {
  font-weight: 600;
}

.error-box {
  padding: 10px 12px;
  border-radius: 8px;
  background-color: color-mix(in srgb, #f44336 12%, transparent);
  border: 1px solid color-mix(in srgb, #f44336 55%, transparent);
}

@media (max-width: 1100px) {
  .template-manager {
    grid-template-columns: 1fr;
  }
}
</style>
