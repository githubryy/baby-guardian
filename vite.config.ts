import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'path';
import fs from 'fs';

/**
 * 自动将 cloudfunctions 目录复制到编译输出目录
 * - 每个云函数已内联 utils.js（require('./utils')），可独立部署
 * - 排除 shared/ 目录（公共工具源文件，非云函数，无需上传）
 */
function copyCloudFunctions() {
  return {
    name: 'copy-cloudfunctions',
    closeBundle() {
      const src = path.resolve(__dirname, 'cloudfunctions');
      if (!fs.existsSync(src)) return;

      // uni-app 编译输出目录（dev: dist/dev/mp-weixin, build: dist/build/mp-weixin）
      const outDir =
        process.env.UNI_OUTPUT_DIR ||
        (process.env.NODE_ENV === 'production'
          ? path.resolve(__dirname, 'dist/build/mp-weixin')
          : path.resolve(__dirname, 'dist/dev/mp-weixin'));

      const dest = path.join(outDir, 'cloudfunctions');
      fs.cpSync(src, dest, {
        recursive: true,
        filter: (s) => !s.includes(path.sep + 'shared'),
      });
      console.log(`[cloudfunctions] 已复制到 ${dest}`);
    },
  };
}

export default defineConfig({
  plugins: [uni(), copyCloudFunctions()],
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
