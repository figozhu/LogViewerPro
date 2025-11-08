import { defineStore } from 'pinia';
import type { SystemLogEntry } from '@shared/models/system-log';

interface SystemLogState {
  logs: SystemLogEntry[];
  loading: boolean;
  error: string;
  limit: number;
}

/**
 * 统一管理系统日志（主进程写入 app.log）的状态，便于随时刷新/查看。 */
export const useSystemLogStore = defineStore('systemLogStore', {
  state: (): SystemLogState => ({
    logs: [],
    loading: false,
    error: '',
    limit: 200
  }),
  actions: {
    /**
     * 拉取最近的日志记录，limit 默认取 state.limit，可在调用时传参覆盖。 */
    async fetchRecent(limit?: number): Promise<void> {
      this.loading = true;
      this.error = '';
      try {
        const effectiveLimit = limit ?? this.limit;
        const result = await window.logViewerApi.getRecentLogs(effectiveLimit);
        this.logs = result;
        this.limit = effectiveLimit;
      } catch (error) {
        this.error = formatError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    /**
     * 更新展示的行数限制，并触发重新加载。 */
    async setLimit(limit: number): Promise<void> {
      const normalized = Math.max(50, Math.min(limit, 1000));
      this.limit = normalized;
      await this.fetchRecent(normalized);
    }
  }
});

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
