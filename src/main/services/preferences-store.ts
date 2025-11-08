import Store from 'electron-store';
import type { UserPreferences } from '@shared/models/preferences';

interface PreferencesSchema {
  data: UserPreferences;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  defaultQueryLimit: 1000,
  rememberWindowState: true,
  windowState: {
    width: 1280,
    height: 800,
    maximized: false
  },
  lastUpdatedAt: Date.now()
};

/**
 * 负责将用户偏好保存在 electron-store 中，提供读取与增量更新能力。 */
export class PreferencesStore {
  private store: Store<PreferencesSchema>;

  constructor() {
    this.store = new Store<PreferencesSchema>({
      name: 'user-preferences',
      defaults: {
        data: DEFAULT_PREFERENCES
      }
    });
  }

  /**
   * 读取完整偏好结构。 */
  public get(): UserPreferences {
    return this.store.get('data', DEFAULT_PREFERENCES);
  }

  /**
   * 增量更新偏好，并写入更新时间。 */
  public update(patch: Partial<UserPreferences>): UserPreferences {
    const next: UserPreferences = {
      ...this.get(),
      ...patch,
      lastUpdatedAt: Date.now()
    };
    this.store.set('data', next);
    return next;
  }
}
