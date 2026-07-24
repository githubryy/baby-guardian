/// <reference types="@dcloudio/types" />
import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import uviewPlus from 'uview-plus';
import App from './App.vue';
import FabButton from '@/components/FabButton.vue';

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(uviewPlus);
  app.component('FabButton', FabButton);
  return { app, pinia };
}
