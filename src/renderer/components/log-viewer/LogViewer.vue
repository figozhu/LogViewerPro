<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { RecycleScroller } from 'vue-virtual-scroller';
import { useLogsStore } from '../../stores/logsStore';

type RangeUpdatePayload = {
  startIndex: number;
  endIndex: number;
};

interface DetailEntry {
  name: string;
  value: string;
  pretty: string;
  isJson: boolean;
  raw: unknown;
}

const logsStore = useLogsStore();
const { t } = useI18n();
const {
  schema,
  rows,
  total,
  loading,
  error,
  query,
  filterOptions,
  selectedRow,
  selectedRowIndex,
  hasMore
} = storeToRefs(logsStore);

const hasFile = computed(() => Boolean(logsStore.filePath));
const columns = computed(() => schema.value?.columns ?? []);
const levelField = computed(() => (columns.value.find((col) => col.name === 'level') ? 'level' : ''));
const primaryKey = computed(() => {
  if (rows.value.length && 'id' in rows.value[0]!) {
    return 'id';
  }
  return columns.value[0]?.name ?? 'id';
});

const detailEntries = computed<DetailEntry[]>(() => {
  if (!selectedRow.value) return [];
  return Object.entries(selectedRow.value).map(([name, raw]) => {
    const { isJson, pretty } = toJsonPretty(raw);
    return {
      name,
      value: formatCellValue(raw),
      pretty,
      isJson,
      raw
    };
  });
});

const levelColors: Record<string, string> = {
  ERROR: 'error',
  WARN: 'warn',
  WARNING: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
};

/**
 * 触发一次全文搜索：重置分页并重新加载。
 */
const handleSearch = () => {
  logsStore.resetPagination();
  void logsStore.refresh();
};

/**
 * 变更过滤器，并重新执行查询。
 */
const handleFilterChange = (column: string, event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  logsStore.setFilter(column, value);
  logsStore.resetPagination();
  void logsStore.refresh();
};

/**
 * 根据虚拟滚动的 endIndex 判断是否需要追加下一页数据。
 */
const handleRangeUpdate = (payload: RangeUpdatePayload) => {
  if (payload.endIndex >= rows.value.length - 5) {
    void logsStore.loadMore();
  }
};

/**
 * 设置当前选中的日志条目，供详情面板展示。
 */
const handleRowClick = (index: number) => {
  logsStore.selectRow(index);
};

/**
 * 复制详情字段，方便用户快速分享上下文。
 */
const copyField = async (value: unknown) => {
  const text = formatCellValue(value);
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.warn(t('logViewer.copyFailed'), err);
  }
};

const isLevelColumn = (name: string) => levelField.value === name;

const normalizeLevel = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
};

const rowClasses = (row: Record<string, unknown>, index: number) => {
  const classes = ['log-row'];
  if (selectedRowIndex.value === index) {
    classes.push('active');
  }
  const levelName = normalizeLevel(row[levelField.value]);
  const levelClass = levelName && levelColors[levelName];
  if (levelClass) {
    classes.push(`level-${levelClass}`);
  }
  return classes;
};

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const toJsonPretty = (value: unknown): { isJson: boolean; pretty: string } => {
  if (typeof value !== 'string') {
    return { isJson: false, pretty: '' };
  }
  try {
    const parsed = JSON.parse(value);
    return { isJson: true, pretty: JSON.stringify(parsed, null, 2) };
  } catch {
    return { isJson: false, pretty: '' };
  }
};
</script>

<template>
  <section class="log-viewer">
    <h2>{{ t('logViewer.title') }}</h2>
    <p v-if="!hasFile" class="placeholder">{{ t('logViewer.emptyPrompt') }}</p>
    <div v-else class="viewer-grid">
      <section class="list-pane">
        <div class="controls">
          <input
            v-model="query.search"
            type="text"
            :placeholder="t('logViewer.searchPlaceholder')"
            @keyup.enter="handleSearch"
          />
          <button type="button" :disabled="loading" @click="handleSearch">
            {{ loading ? t('logViewer.searching') : t('logViewer.search') }}
          </button>
        </div>

        <div v-if="Object.keys(filterOptions).length" class="filters">
          <div v-for="(options, column) in filterOptions" :key="column" class="filter-item">
            <label :for="`filter-${column}`">{{ column }}</label>
            <select
              :id="`filter-${column}`"
              :value="query.filters[column] ?? ''"
              @change="handleFilterChange(column, $event)"
            >
              <option value="">{{ t('logViewer.filterAll') }}</option>
              <option v-for="option in options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>
        </div>

        <div class="meta-row">
          <span>{{ t('logViewer.total', { count: total }) }}</span>
          <span v-if="schema">
            {{ t('logViewer.templateLabel', { name: schema?.meta?.template_name ?? '-' }) }}
          </span>
        </div>
        <p v-if="error" class="error">{{ error }}</p>

        <div v-if="rows.length" class="table-wrapper">
          <div class="table-header">
            <div v-for="column in columns" :key="column.name" class="cell header">
              {{ column.name }}
            </div>
          </div>

          <RecycleScroller
            v-slot="{ item, index }"
            class="log-scroller"
            :items="rows"
            :item-size="48"
            :key-field="primaryKey"
            @update="handleRangeUpdate"
          >
            <div :class="rowClasses(item, index)" @click="handleRowClick(index)">
              <div v-for="column in columns" :key="column.name" class="cell">
                <span
                  v-if="isLevelColumn(column.name)"
                  class="level-pill"
                  :data-level="normalizeLevel(item[column.name])"
                >
                  {{ normalizeLevel(item[column.name]) || 'N/A' }}
                </span>
                <span v-else>{{ formatCellValue(item[column.name]) }}</span>
              </div>
            </div>
          </RecycleScroller>
          <p class="hint">
            {{
              hasMore
                ? t('logViewer.loadHint.more', { current: rows.length, total })
                : t('logViewer.loadHint.done', { current: rows.length, total })
            }}
          </p>
        </div>
        <p v-else-if="hasFile && !loading" class="placeholder">
          {{ t('logViewer.noResult') }}
        </p>
      </section>

      <section class="details-pane">
        <div class="details-header">
          <h3>{{ t('logViewer.detailTitle') }}</h3>
          <p v-if="selectedRowIndex >= 0" class="details-meta">
            {{ t('logViewer.detailCurrent', { index: selectedRowIndex + 1 }) }}
          </p>
        </div>
        <p v-if="!selectedRow" class="placeholder">{{ t('logViewer.detailPlaceholder') }}</p>
        <div v-else class="detail-list">
          <article v-for="entry in detailEntries" :key="entry.name" class="detail-entry">
            <header>
              <span>{{ entry.name }}</span>
              <button type="button" @click="copyField(entry.raw)">{{ t('logViewer.copy') }}</button>
            </header>
            <pre v-if="entry.isJson">{{ entry.pretty }}</pre>
            <p v-else>{{ entry.value }}</p>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>


<style scoped>
.log-viewer {
  margin-top: 24px;
  padding: 24px;
  border-radius: 16px;
  background-color: var(--panel-bg);
  border: 1px solid var(--panel-border);
  color: var(--text-color);
}

.viewer-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 16px;
}

.list-pane,
.details-pane {
  background-color: var(--surface-color);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--panel-border);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
}

.list-pane {
  min-height: 520px;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

input {
  flex: 1;
  border-radius: 8px;
  border: 1px solid var(--control-border);
  padding: 8px 12px;
  background-color: var(--control-bg);
  color: var(--text-color);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 45%, transparent);
}

button {
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  background-color: var(--accent-color);
  color: var(--accent-contrast);
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}

select {
  padding: 6px 32px 6px 10px;
  border-radius: 8px;
  background-color: var(--control-bg);
  color: var(--text-color);
  border: 1px solid var(--control-border);
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

select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 45%, transparent);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 8px;
  color: var(--muted-text);
  flex-wrap: wrap;
  gap: 8px;
}

.table-wrapper {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--surface-color);
}

.table-header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  background-color: color-mix(in srgb, var(--text-color) 8%, transparent);
  border-bottom: 1px solid var(--panel-border);
}

.table-header .cell {
  font-size: 13px;
  font-weight: 600;
  padding: 8px 10px;
  text-transform: uppercase;
}

.log-scroller {
  height: 360px;
}

.log-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  padding: 8px 10px;
  border-bottom: 1px solid var(--panel-border);
  transition: background 0.2s ease;
  cursor: pointer;
}

.log-row:hover {
  background-color: color-mix(in srgb, var(--text-color) 8%, transparent);
}

.log-row.active {
  background-color: color-mix(in srgb, var(--accent-color) 45%, transparent);
}

.cell {
  font-size: 13px;
  line-height: 1.4;
  word-break: break-all;
}

.level-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background-color: color-mix(in srgb, var(--text-color) 15%, transparent);
}

.log-row.level-error .cell:first-child,
.level-pill[data-level='ERROR'] {
  color: #ff6b6b;
}

.log-row.level-warn .cell:first-child,
.level-pill[data-level='WARN'],
.level-pill[data-level='WARNING'] {
  color: #ffb347;
}

.log-row.level-info .cell:first-child,
.level-pill[data-level='INFO'] {
  color: #4fc3f7;
}

.log-row.level-debug .cell:first-child,
.level-pill[data-level='DEBUG'] {
  color: #a5d6a7;
}

.log-row.level-trace .cell:first-child,
.level-pill[data-level='TRACE'] {
  color: #ce93d8;
}

.details-pane {
  display: flex;
  flex-direction: column;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}

.details-header h3 {
  margin: 0;
}

.details-meta {
  font-size: 13px;
  color: var(--muted-text);
}

.detail-list {
  margin-top: 12px;
  max-height: 40vh;
  overflow-y: auto;
  padding-right: 4px;
}

.detail-entry {
  border-bottom: 1px solid var(--panel-border);
  padding: 10px 0;
}

.detail-entry header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 13px;
}

.detail-entry header button {
  font-size: 12px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--accent-color) 25%, var(--control-bg));
  color: var(--accent-contrast);
}

.detail-entry pre,
.detail-entry p {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  padding: 6px;
  border-radius: 6px;
  background-color: var(--control-bg);
  border: 1px solid var(--control-border);
  white-space: pre-wrap;
  word-break: break-all;
}

.error {
  color: #ef5350;
}

.placeholder {
  color: var(--muted-text);
}

.hint {
  font-size: 12px;
  padding: 8px 10px;
  color: var(--muted-text);
  margin: 0;
}

@media (max-width: 1180px) {
  .list-pane {
    min-height: 420px;
  }
}
</style>
