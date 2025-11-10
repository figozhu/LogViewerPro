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
  const value = (event.target as HTMLInputElement).value.trim();
  logsStore.setFilter(column, value);
  logsStore.resetPagination();
  void logsStore.refresh();
};

/**
 * 根据虚拟滚动的 endIndex 判断是否需要追加下一页数据。
 */
const handleRangeUpdate = (payload: RangeUpdatePayload) => {
  // 当滚动到接近底部时（距离底部5条以内），且还有更多数据时，触发加载
  if (hasMore.value && !loading.value && payload.endIndex >= rows.value.length - 5) {
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

const highlightText = (text: string, keyword: string): string => {
  if (!keyword || !text) return text;
  const keywords: string[] = [];
  const quoted = keyword.match(/"([^"]+)"/g);
  let remaining = keyword;
  if (quoted) {
    quoted.forEach(q => {
      keywords.push(q.slice(1, -1));
      remaining = remaining.replace(q, '');
    });
  }
  const unquoted = remaining.trim().split(/\s+/).filter(k => k);
  keywords.push(...unquoted);
  if (keywords.length === 0) return text;
  const pattern = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
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
            <input
              :id="`filter-${column}`"
              :list="`datalist-${column}`"
              type="text"
              :value="query.filters[column] ?? ''"
              :placeholder="t('logViewer.filterAll')"
              @change="handleFilterChange(column, $event)"
            />
            <datalist :id="`datalist-${column}`">
              <option v-for="option in options" :key="option" :value="option" />
            </datalist>
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
            :item-size="82"
            :key-field="primaryKey"
            @update="handleRangeUpdate"
            @scroll-end="() => hasMore && !loading && logsStore.loadMore()"
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
                <span v-else v-html="highlightText(formatCellValue(item[column.name]), query.search)"></span>
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
            <pre v-if="entry.isJson" v-html="highlightText(entry.pretty, query.search)"></pre>
            <p v-else v-html="highlightText(entry.value, query.search)"></p>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>


<style scoped>
.log-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-color);
}

.log-viewer > h2 {
  padding: 16px 24px 0;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.log-viewer > p.placeholder {
  padding: 16px 24px;
  color: var(--muted-text);
}

.viewer-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 0;
  overflow: hidden;
}

.list-pane {
  display: flex;
  flex-direction: column;
  background-color: var(--surface-color);
  border-right: 1px solid var(--panel-border);
  overflow: hidden;
}

.details-pane {
  display: flex;
  flex-direction: column;
  background-color: var(--surface-color);
  overflow: hidden;
}

.controls {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: var(--surface-color);
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
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
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: var(--surface-color);
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}

.filter-item input {
  padding: 6px 10px;
  border-radius: 8px;
  background-color: var(--control-bg);
  color: var(--text-color);
  border: 1px solid var(--control-border);
}

.filter-item input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 45%, transparent);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 8px 16px;
  color: var(--muted-text);
  background: var(--surface-color);
  border-bottom: 1px solid var(--panel-border);
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--surface-color);
}

.table-header {
  display: flex;
  background-color: color-mix(in srgb, var(--text-color) 8%, transparent);
  border-bottom: 1px solid var(--panel-border);
}

.table-header .cell {
  font-size: 13px;
  font-weight: 600;
  padding: 8px 10px;
  text-transform: uppercase;
  flex: 0 0 150px;
  text-align: left;
  border-right: 1px solid var(--panel-border);
}

.table-header .cell:last-child {
  border-right: none;
}

.table-header .cell:last-child {
  flex: 1 1 auto;
  min-width: 200px;
}

.log-scroller {
  flex: 1;
  min-height: 0;
}

.log-row {
  display: flex;
  padding: 0;
  border-bottom: 1px solid var(--panel-border);
  transition: background 0.2s ease;
  cursor: pointer;
  align-items: start;
}

.log-row:hover {
  background-color: color-mix(in srgb, var(--text-color) 8%, transparent);
}

.log-row.active {
  background-color: color-mix(in srgb, var(--accent-color) 45%, transparent);
}

.log-row .cell {
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  padding: 10px;
  flex: 0 0 150px;
  text-align: left;
  border-right: 1px solid var(--panel-border);
  max-height: 60px;
}

.log-row .cell :deep(mark) {
  background-color: #ffeb3b;
  color: #000;
  padding: 2px 0;
  border-radius: 2px;
}

.log-row .cell:last-child {
  border-right: none;
}

.log-row .cell:last-child {
  flex: 1 1 auto;
  min-width: 200px;
}

.level-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background-color: color-mix(in srgb, var(--text-color) 15%, transparent);
  text-align: center;
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

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.details-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.details-meta {
  font-size: 12px;
  color: var(--muted-text);
}

.details-header + .placeholder {
  padding: 16px;
}

.detail-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
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
  font-size: 16px;
  line-height: 1.6;
  padding: 8px;
  border-radius: 6px;
  background-color: var(--control-bg);
  border: 1px solid var(--control-border);
  white-space: pre-wrap;
  word-break: break-all;
}

.detail-entry :deep(mark) {
  background-color: #ffeb3b;
  color: #000;
  padding: 2px 0;
  border-radius: 2px;
}

.error {
  color: #ef5350;
  padding: 12px 16px;
  margin: 0;
}

.placeholder {
  color: var(--muted-text);
  padding: 16px;
  margin: 0;
}

.hint {
  font-size: 11px;
  padding: 6px 16px;
  color: var(--muted-text);
  margin: 0;
  background: var(--surface-color);
  border-top: 1px solid var(--panel-border);
  flex-shrink: 0;
}

@media (max-width: 1180px) {
  .viewer-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 300px;
  }

  .list-pane {
    border-right: none;
    border-bottom: 1px solid var(--panel-border);
  }
}
</style>
