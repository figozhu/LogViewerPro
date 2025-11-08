import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePreferenceStore } from '../src/renderer/stores/preferenceStore';
import type { UserPreferences } from '../src/shared/models/preferences';

const samplePreferences: UserPreferences = {
  theme: 'dark',
  defaultQueryLimit: 1000,
  language: 'auto',
  rememberWindowState: true,
  windowState: {
    width: 1280,
    height: 800,
    x: 10,
    y: 20,
    maximized: false
  },
  lastUpdatedAt: Date.now()
};

describe('preferenceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('fetchPreferences loads data via IPC', async () => {
    const getPreferences = vi.fn().mockResolvedValue(samplePreferences);
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      logViewerApi: {
        getPreferences,
        updatePreferences: vi.fn()
      }
    } as never;

    const store = usePreferenceStore();
    await store.fetchPreferences();
    expect(getPreferences).toHaveBeenCalledTimes(1);
    expect(store.preferences).toEqual(samplePreferences);
    expect(store.loading).toBe(false);
  });

  it('updatePreferences persists patch and updates store', async () => {
    const getPreferences = vi.fn().mockResolvedValue(samplePreferences);
    const updatePreferences = vi.fn().mockResolvedValue({
      ...samplePreferences,
      theme: 'light'
    });
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      logViewerApi: {
        getPreferences,
        updatePreferences
      }
    } as never;

    const store = usePreferenceStore();
    await store.fetchPreferences();
    await store.updatePreferences({ theme: 'light' });

    expect(updatePreferences).toHaveBeenCalledWith({ theme: 'light' });
    expect(store.preferences?.theme).toBe('light');
  });
});
