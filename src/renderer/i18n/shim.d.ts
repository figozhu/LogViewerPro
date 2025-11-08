import 'vue-i18n';
import type { AppMessageSchema } from './index';

declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends AppMessageSchema {}
}
