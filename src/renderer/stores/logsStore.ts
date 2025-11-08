import { defineStore } from 'pinia';
import type { SchemaInfo } from '@shared/models/query';
import type { QueryRequest } from '@shared/models/query';

interface LogsState {
  filePath: string;
  schema: SchemaInfo | null;
  rows: Record<string, unknown>[];
  total: number;
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
}

export const useLogsStore = defineStore('logsStore', {
  state: (): LogsState => ({
    filePath: '',
    schema: null,
    rows: [],
    total: 0,
    loading: false,
    error: '',
    query: {
      search: '',
      filters: {},
      limit: 100,
      offset: 0,
      orderBy: '',
      orderDir: 'DESC'
    },
    filterOptions: {}
  }),
  actions: {
    async setActiveFile(filePath: string): Promise<void> {
      if (!filePath) {
        return;
      }
      this.filePath = filePath;
      await this.loadSchema();
      await Promise.all([this.refresh(), this.loadFilterOptions()]);
    },

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

    async refresh(): Promise<void> {
      if (!this.filePath) return;
      this.loading = true;
      this.error = '';
      try {
        const request: QueryRequest = {
          filePath: this.filePath,
          search: this.query.search || undefined,
          filters: Object.keys(this.query.filters).length ? this.query.filters : undefined,
          limit: this.query.limit,
          offset: this.query.offset,
          orderBy: this.query.orderBy,
          orderDir: this.query.orderDir
        };
        const response = await window.logViewerApi.runQuery(request);
        this.rows = response.rows;
        this.total = response.total;
      } catch (error) {
        this.error = formatError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async loadFilterOptions(columns?: string[]): Promise<void> {
      if (!this.filePath) return;
      const targetColumns =
        columns ?? this.schema?.columns.slice(0, 3).map((col) => col.name) ?? [];
      if (!targetColumns.length) return;
      const options = await window.logViewerApi.getFilterOptions({
        filePath: this.filePath,
        columns: targetColumns
      });
      this.filterOptions = options;
    },

    setSearch(value: string): void {
      this.query.search = value;
    },

    setFilter(field: string, value: string): void {
      if (value) {
        this.query.filters[field] = value;
      } else {
        delete this.query.filters[field];
      }
    },

    resetPagination(): void {
      this.query.offset = 0;
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
