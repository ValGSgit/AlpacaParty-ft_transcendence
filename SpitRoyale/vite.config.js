import { defineConfig } from 'vite';

export default defineConfig({
  base: '/spit-royale/',
  server: {
    port: 5173,
    proxy: {
      '/spit-royale/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        rewriteWsOrigin: true,
        rewrite: (path) => path.replace(/^\/spit-royale\/ws/, '/ws'),
      },
    },
  },
  optimizeDeps: {
    include: ['three'],
  },
});
