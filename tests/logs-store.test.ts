import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLogsStore } from '../src/renderer/stores/logsStore';
import type { SchemaInfo } from '../src/shared/models/query';

const schema: SchemaInfo = {
  columns: [
    { name: 'timestamp', type: 'INTEGER', notnull: 0 },
    { name: 'level', type: 'TEXT', notnull: 0 },
    { name: 'message', type: 'TEXT', notnull: 0 }
  ],
  meta: {
    template_name: 'API Log',
    timestamp_field: 'timestamp'
  }
};

const rows = [
  { timestamp: 1, level: 'INFO', message: 'Hello' },
  { timestamp: 2, level: 'ERROR', message: 'Oops' }
];

describe('logsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  const mockApi = () => {
    const api = {
      getSchema: vi.fn().mockResolvedValue(schema),
      runQuery: vi.fn().mockResolvedValue({ rows, total: 2 }),
      getFilterOptions: vi.fn().mockResolvedValue({ level: ['INFO', 'ERROR'] })
    };
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      logViewerApi: {
        ...api
      }
    } as never;
    return api;
  };

  it('setActiveFile loads schema, rows, and filters', async () => {
    const api = mockApi();
    const store = useLogsStore();
    await store.setActiveFile('test.log');
    expect(api.getSchema).toHaveBeenCalledWith('test.log');
    expect(api.runQuery).toHaveBeenCalled();
    expect(api.getFilterOptions).toHaveBeenCalled();
    expect(store.schema).toEqual(schema);
    expect(store.rows).toEqual(rows);
    expect(store.total).toBe(2);
  });

  it('setDefaultLimit updates limit and refreshes data', async () => {
    const api = mockApi();
    const store = useLogsStore();
    await store.setActiveFile('test.log');
    api.runQuery.mockClear();
    await store.setDefaultLimit(5000);
    expect(store.query.limit).toBe(1000);
    expect(api.runQuery).toHaveBeenCalled();
  });
});
