export type ThemePreference = 'dark' | 'light' | 'system';

export interface WindowStatePreference {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

export type LanguagePreference = 'auto' | 'zh-CN' | 'en-US';

export interface UserPreferences {
  theme: ThemePreference;
  defaultQueryLimit: number;
  language: LanguagePreference;
  rememberWindowState: boolean;
  windowState: WindowStatePreference;
  lastUpdatedAt: number;
}
