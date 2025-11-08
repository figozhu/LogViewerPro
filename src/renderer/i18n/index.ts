import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

export const DEFAULT_LOCALE = 'zh-CN';
export const FALLBACK_LOCALE = 'en-US';

export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS
} as const;

export type AppMessageSchema = typeof messages['zh-CN'];

const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  messages
});

export default i18n;
