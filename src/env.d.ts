/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 扩展 uni 全局属性
interface Uni {
  $appReady?: import('vue').Ref<boolean>;
}


