import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import i18n from './i18n';

/**
 * 初始化 Vue 应用并挂载全局状态容器。
 */
const bootstrap = () => {
  const app = createApp(App);
  app.use(createPinia());
  app.use(i18n);
  app.mount('#app');
};

bootstrap();
