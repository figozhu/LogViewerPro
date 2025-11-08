<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useTemplateStore } from '../../stores/templateStore';

/**
 * 模板管理界面：左侧展示模板列表，右侧用于编辑表单与正则测试。
 */
const templateStore = useTemplateStore();
const { templates, loading, saving, currentForm, mode, errorMessage, testResults } =
  storeToRefs(templateStore);

const isEditing = computed(() => mode.value === 'editing');
const isCreating = computed(() => mode.value === 'creating');

const actionTitle = computed(() => {
  if (isEditing.value) return '编辑模板';
  if (isCreating.value) return '创建模板';
  return '请选择左侧模板或创建新模板';
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
  if (confirm('确定要删除该模板吗？此操作不可恢复。')) {
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
        <h2>模板列表</h2>
        <button type="button" class="primary" @click="handleCreate">新建模板</button>
      </div>
      <p v-if="loading">正在加载模板...</p>
      <ul v-else>
        <li
          v-for="template in templates"
          :key="template.id"
          :class="{ active: currentForm.id === template.id }"
        >
          <div>
            <strong>{{ template.name }}</strong>
            <small
              >时间字段: {{ template.timestampField }} ｜ 全文字段: {{ template.ftsField }}</small
            >
          </div>
          <div class="actions">
            <button type="button" @click="templateStore.startEdit(template)">编辑</button>
            <button type="button" class="danger" @click="handleDelete(template.id)">删除</button>
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
          模板名称
          <input v-model="currentForm.name" type="text" placeholder="请输入模板名称" required />
        </label>
        <label>
          正则表达式
          <textarea
            v-model="currentForm.regex"
            rows="3"
            placeholder="示例：\\[(?<timestamp>.*?)\\] \\[(?<level>.*?)\\] (?<message>.*)"
            required
          />
        </label>
        <div class="inline">
          <label>
            时间字段
            <input
              v-model="currentForm.timestampField"
              type="text"
              placeholder="timestamp"
              required
            />
          </label>
          <label>
            全文字段
            <input v-model="currentForm.ftsField" type="text" placeholder="message" required />
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" class="primary" :disabled="saving">
            {{ saving ? '保存中...' : '保存模板' }}
          </button>
          <button type="button" @click="handleCancel">取消</button>
        </div>
      </form>

      <section class="regex-tester">
        <div class="tester-header">
          <h3>正则测试工具</h3>
          <button type="button" class="secondary" @click="runRegexTest">运行测试</button>
        </div>
        <textarea
          v-model="currentForm.sampleInput"
          rows="6"
          placeholder="粘贴示例日志，每行一个样本"
        />

        <div v-if="testResults.length > 0" class="test-results">
          <h4>匹配结果 ({{ testResults.length }} 条)</h4>
          <div
            v-for="result in testResults"
            :key="result.line"
            class="test-result-item"
            :class="{ matched: result.matched }"
          >
            <p><strong>日志：</strong>{{ result.line }}</p>
            <p v-if="!result.matched">未匹配</p>
            <div v-else class="group-grid">
              <div v-for="(value, key) in result.groups" :key="key" class="group-item">
                <span class="group-key">{{ key }}</span>
                <span class="group-value">{{ value }}</span>
              </div>
            </div>
          </div>
        </div>
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

.template-list {
  background-color: #1a1a1a;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-list li.active {
  border-color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}

.template-list .actions {
  display: flex;
  gap: 8px;
}

.template-form {
  background-color: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
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
}

input,
textarea {
  background-color: #121212;
  color: #f5f5f5;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px;
  font-size: 0.95rem;
}

.inline {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
}

button {
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.95rem;
}

button.primary {
  background-color: #4caf50;
  color: #fff;
}

button.secondary {
  background-color: #2196f3;
  color: #fff;
}

button.danger {
  background-color: #f44336;
  color: #fff;
}

.regex-tester {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.test-result-item {
  padding: 8px;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.test-result-item.matched {
  border-color: rgba(76, 175, 80, 0.6);
  background-color: rgba(76, 175, 80, 0.08);
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
  background-color: rgba(0, 0, 0, 0.2);
  padding: 6px;
  border-radius: 6px;
}

.group-key {
  font-size: 0.85rem;
  color: #9e9e9e;
}

.group-value {
  font-weight: 600;
}

.error-box {
  padding: 10px 12px;
  border-radius: 8px;
  background-color: rgba(244, 67, 54, 0.15);
  border: 1px solid rgba(244, 67, 54, 0.6);
}

@media (max-width: 1100px) {
  .template-manager {
    grid-template-columns: 1fr;
  }
}
</style>
