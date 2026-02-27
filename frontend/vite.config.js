/**
 * Vite Configuration
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/1
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['localhost', 'frontend', 'nginx'],
    // Route HMR websocket through nginx on /ws so the browser doesn't try
    // to open a direct ws://localhost:8080/?token=... connection that nginx
    // has no rule for.
    hmr: {
      path: '/ws',
      clientPort: 8080,
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
