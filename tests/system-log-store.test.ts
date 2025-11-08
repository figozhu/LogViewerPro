import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSystemLogStore } from '../src/renderer/stores/systemLogStore';

const mockLogs = [
  { timestamp: '2024-01-01T00:00:00Z', level: 'INFO', message: 'Ready', raw: '[...INFO...]' },
  { timestamp: '2024-01-01T00:01:00Z', level: 'ERROR', message: 'Failed', raw: '[...ERROR...]' }
] as const;

describe('systemLogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('fetchRecent loads logs with default limit', async () => {
    const getRecentLogs = vi.fn().mockResolvedValue(mockLogs);
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      logViewerApi: {
        getRecentLogs
      }
    } as never;

    const store = useSystemLogStore();
    await store.fetchRecent();
    expect(getRecentLogs).toHaveBeenCalledWith(store.limit);
    expect(store.logs).toEqual(mockLogs);
    expect(store.loading).toBe(false);
  });

  it('setLimit clamps input and triggers refresh', async () => {
    const getRecentLogs = vi.fn().mockResolvedValue(mockLogs);
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      logViewerApi: {
        getRecentLogs
      }
    } as never;

    const store = useSystemLogStore();
    await store.setLimit(5000);
    expect(store.limit).toBe(1000);
    expect(getRecentLogs).toHaveBeenCalledWith(1000);
  });
});
