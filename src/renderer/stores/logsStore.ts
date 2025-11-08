import { defineStore } from 'pinia';
import type { SchemaInfo } from '@shared/models/query';
import type { QueryRequest } from '@shared/models/query';

interface LogsState {
  filePath: string;
  schema: SchemaInfo | null;
  rows: Record<string, unknown>[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string;
  query: {
    search: string;
    filters: Record<string, string>;
    limit: number;
    offset: number;
    orderBy: string;
    orderDir: 'ASC' | 'DESC';
  };
  filterOptions: Record<string, string[]>;
  selectedRow: Record<string, unknown> | null;
  selectedRowIndex: number;
}

export const useLogsStore = defineStore('logsStore', {
  state: (): LogsState => ({
    filePath: '',
    schema: null,
    rows: [],
    total: 0,
    hasMore: false,
    loading: false,
    error: '',
    query: {
      search: '',
      filters: {},
      limit: 1000,
      offset: 0,
      orderBy: '',
      orderDir: 'DESC'
    },
    filterOptions: {},
    selectedRow: null,
    selectedRowIndex: -1
  }),
  actions: {
    /**
     * 设定当前活跃文件，加载 Schema、数据与过滤选项。
     */
    async setActiveFile(filePath: string): Promise<void> {
      if (!filePath) {
        return;
      }
      this.filePath = filePath;
      await this.loadSchema();
      await Promise.all([this.refresh(), this.loadFilterOptions()]);
    },

    /**
     * 读取 SQLite 中的列信息，并根据模板元数据自动确定排序字段。
     */
    async loadSchema(): Promise<void> {
      if (!this.filePath) return;
      try {
        this.schema = await window.logViewerApi.getSchema(this.filePath);
        const defaultOrder = this.schema.meta['timestamp_field'] ?? 'id';
        this.query.orderBy = defaultOrder;
      } catch (error) {
        this.error = formatError(error);
        throw error;
      }
    },

    /**
     * 执行查询，支持替换现有结果或在虚拟滚动中追加数据。
     */
    async refresh(options: { append?: boolean; offset?: number } = {}): Promise<void> {
      if (!this.filePath) return;
      this.loading = true;
      this.error = '';
      const append = options.append ?? false;
      if (!append) {
        this.selectedRow = null;
        this.selectedRowIndex = -1;
      }
      try {
        const offset = options.offset ?? this.query.offset ?? 0;
        // Pinia state内部是 Proxy，直接透传到 IPC 会触发 structuredClone 报错，因此在发送前浅拷贝成普通对象。
        const filtersPayload =
          Object.keys(this.query.filters).length > 0 ? { ...this.query.filters } : undefined;
        const request: QueryRequest = {
          filePath: this.filePath,
          search: this.query.search || undefined,
          filters: filtersPayload,
          limit: this.query.limit,
          offset,
          orderBy: this.query.orderBy,
          orderDir: this.query.orderDir
        };
        const response = await window.logViewerApi.runQuery(request);
        this.rows = append ? [...this.rows, ...response.rows] : response.rows;
        this.total = response.total;
        this.query.offset = append ? this.rows.length : response.rows.length;
        this.hasMore = this.rows.length < this.total;
      } catch (error) {
        this.error = formatError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 基于 Schema 推断低基数字段，获取过滤选项。
     */
    async loadFilterOptions(columns?: string[]): Promise<void> {
      if (!this.filePath) return;
      const targetColumns = columns ?? this.pickFilterColumns();
      if (!targetColumns.length) return;
      const options = await window.logViewerApi.getFilterOptions({
        filePath: this.filePath,
        columns: targetColumns
      });
      this.filterOptions = options;
    },

    /**
     * 设置全文搜索关键词。
     */
    setSearch(value: string): void {
      this.query.search = value;
    },

    /**
     * 动态添加或移除过滤条件。
     */
    setFilter(field: string, value: string): void {
      if (value) {
        this.query.filters[field] = value;
      } else {
        delete this.query.filters[field];
      }
    },

    /**
     * 重置分页偏移量，适用于重新搜索或更换过滤条件。
     */
    resetPagination(): void {
      this.query.offset = 0;
      this.rows = [];
      this.hasMore = false;
    },

    /**
     * 设置默认查询条数，并在需要时触发刷新。 */
    async setDefaultLimit(limit: number): Promise<void> {
      if (!Number.isFinite(limit)) return;
      const normalized = Math.max(50, Math.min(Math.trunc(limit), 1000));
      if (this.query.limit === normalized) return;
      this.query.limit = normalized;
      this.resetPagination();
      if (this.filePath) {
        await this.refresh();
      }
    },

    /**
     * 虚拟滚动触底时的增量加载。
     */
    async loadMore(): Promise<void> {
      if (!this.filePath || this.loading || !this.hasMore) return;
      const nextOffset = this.rows.length;
      await this.refresh({ append: true, offset: nextOffset });
    },

    /**
     * 记录当前被选中的日志行，供详情面板显示。
     */
    selectRow(index: number | null): void {
      if (typeof index !== 'number' || index < 0 || index >= this.rows.length) {
        this.selectedRow = null;
        this.selectedRowIndex = -1;
        return;
      }
      this.selectedRowIndex = index;
      this.selectedRow = this.rows[index];
    },

    /**
     * 依据列名优先级与字段类型挑选需要提供过滤器的列。
     */
    pickFilterColumns(): string[] {
      const columns = this.schema?.columns ?? [];
      if (!columns.length) return [];
      const priority = ['level', 'severity', 'status', 'service', 'env', 'host', 'method'];
      const textColumns = columns.filter(
        (col) => !col.type || col.type.toUpperCase().includes('TEXT')
      );
      const prioritized = priority.filter((name) => columns.some((col) => col.name === name));
      const fallback = textColumns.map((col) => col.name);
      const merged = [...prioritized, ...fallback];
      const deduped: string[] = [];
      for (const name of merged) {
        if (!deduped.includes(name)) {
          deduped.push(name);
        }
        if (deduped.length >= 4) {
          break;
        }
      }
      return deduped;
    }
  }
});

const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
