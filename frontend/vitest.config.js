/**
 * Vitest Configuration
 */
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'src/main.js',
        'src/style.css',
        'src/assets/**',
        'src/games/**',           // 3D game engine (Three.js/WebGL) — untestable in unit tests
        'src/services/socket.js', // WebSocket client — requires live server
        'src/views/ApiTest.vue',  // removed from test suite intentionally
      ],
      thresholds: {
        branches: 30,
        functions: 20,
        lines: 25,
        statements: 25,
      },
    },
  },
})
