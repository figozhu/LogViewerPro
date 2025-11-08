import 'vue-i18n';
import type { AppMessageSchema } from './index';

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends AppMessageSchema {}
}
