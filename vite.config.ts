import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { patchCssModules } from 'vite-css-modules'
import UnoCSS from 'unocss/vite';

// https://vite.dev/config/
export default defineConfig({
  // CI 构建走 GitHub Pages 项目页的 /my-pnpm-app/ 子路径；本地 dev 用根路径
  base: process.env.CI ? '/my-pnpm-app/' : '/',
  plugins: [
    UnoCSS(),
    patchCssModules(),
    react(),
  ],
  css: {
    modules: {
      localsConvention: "camelCase"
    },
  },
  server: {
    port: 4000,
    host: "0.0.0.0"
  },
})