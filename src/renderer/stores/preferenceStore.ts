import { defineStore } from 'pinia';
import type { UserPreferences } from '@shared/models/preferences';

interface PreferenceState {
  preferences: UserPreferences | null;
  loading: boolean;
  saving: boolean;
  error: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  defaultQueryLimit: 100,
  rememberWindowState: true,
  windowState: {
    width: 1280,
    height: 800,
    maximized: false
  },
  lastUpdatedAt: Date.now()
};

/**
 * Renderer 侧的偏好 Store，负责与主进程通信并暴露更新动作。 */
export const usePreferenceStore = defineStore('preferenceStore', {
  state: (): PreferenceState => ({
    preferences: null,
    loading: false,
    saving: false,
    error: ''
  }),
  getters: {
    resolved(state): UserPreferences {
      return state.preferences ?? DEFAULT_PREFERENCES;
    }
  },
  actions: {
    /**
     * 拉取偏好数据。 */
    async fetchPreferences(): Promise<void> {
      this.loading = true;
      this.error = '';
      try {
        this.preferences = await window.logViewerApi.getPreferences();
      } catch (error) {
        this.error = formatError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 更新偏好。 */
    async updatePreferences(patch: Partial<UserPreferences>): Promise<void> {
      this.saving = true;
      this.error = '';
      try {
        this.preferences = await window.logViewerApi.updatePreferences(patch);
      } catch (error) {
        this.error = formatError(error);
        throw error;
      } finally {
        this.saving = false;
      }
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
