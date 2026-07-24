/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// uview-plus 无自带类型声明
declare module 'uview-plus';

// 扩展 uni 全局属性
interface Uni {
  $appReady?: import('vue').Ref<boolean>;
}
