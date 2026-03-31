import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      /** Chỉ dùng khi chạy `vite` riêng cổng 5173 + `tsx server.ts` cổng 3000. Mặc định dùng `npm run dev` (một server). */
      proxy: {
        '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
        '/auth': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      },
    },
  };
});
