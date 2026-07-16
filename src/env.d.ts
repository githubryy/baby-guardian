/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// uni-app 全局属性扩展
declare namespace UniApp {
  interface Uni {
    $appReady?: import('vue').Ref<boolean>;
  }
}
