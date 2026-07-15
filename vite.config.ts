import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'path';

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 静默 node_modules 中依赖库（uview-plus）内部的 @import 弃用警告
        quietDeps: true,
        // uni.scss 因 uni-app 注入机制仍需使用 @import，静默该弃用警告
        // legacy-js-api: uni-app vite 插件暂未适配 modern Sass API，静默该警告
        silenceDeprecations: ['import', 'legacy-js-api'],
      },
    },
  },
});
