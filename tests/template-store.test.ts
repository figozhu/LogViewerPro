import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTemplateStore } from '../src/renderer/stores/templateStore';
import type { LogTemplate } from '../src/shared/models/log-template';

const mockTemplates: LogTemplate[] = [
  {
    id: '1',
    name: 'API Log',
    regex: '\\[(?<timestamp>.*?)\\] (?<level>INFO|ERROR) (?<message>.*)',
    timestampField: 'timestamp',
    ftsField: 'message'
  },
  {
    id: '2',
    name: 'Worker Log',
    regex: '(?<level>WARN): (?<message>.*)',
    timestampField: 'timestamp',
    ftsField: 'message'
  }
];

describe('templateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  const mockApi = () => {
    const api = {
      getTemplates: vi.fn().mockResolvedValue(mockTemplates),
      getRecentItems: vi.fn().mockResolvedValue([]),
      saveRecentItem: vi.fn(),
      saveTemplate: vi.fn().mockResolvedValue(mockTemplates[0]),
      deleteTemplate: vi.fn(),
      getPreferences: vi.fn(),
      updatePreferences: vi.fn()
    };
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      logViewerApi: api
    } as never;
    return api;
  };

  it('fetchAll loads templates via IPC', async () => {
    const api = mockApi();
    const store = useTemplateStore();
    await store.fetchAll();
    expect(api.getTemplates).toHaveBeenCalledTimes(1);
    expect(store.templates).toEqual(mockTemplates);
  });

  it('saveCurrent trims fields and updates list', async () => {
    const api = mockApi();
    const store = useTemplateStore();
    await store.fetchAll();
    store.currentForm = {
      id: '1',
      name: ' API Log ',
      regex: ' (?<level>INFO) (?<message>.*) ',
      timestampField: ' timestamp ',
      ftsField: ' message ',
      sampleInput: ''
    };
    await store.saveCurrent();
    expect(api.saveTemplate).toHaveBeenCalledWith({
      id: '1',
      name: 'API Log',
      regex: '(?<level>INFO) (?<message>.*)',
      timestampField: 'timestamp',
      ftsField: 'message'
    });
    expect(store.mode).toBe('idle');
  });

  it('runRegexTest collects groups from sample input', () => {
    mockApi();
    const store = useTemplateStore();
    store.currentForm = {
      id: undefined,
      name: '',
      regex: '\\[(?<timestamp>.*?)\\] (?<level>INFO|ERROR) (?<message>.*)',
      timestampField: 'timestamp',
      ftsField: 'message',
      sampleInput: '[2024-01-01] INFO Hello\ninvalid'
    };
    store.runRegexTest();
    expect(store.testResults).toHaveLength(2);
    expect(store.testResults[0]?.matched).toBe(true);
    expect(store.testResults[1]?.matched).toBe(false);
  });
});
