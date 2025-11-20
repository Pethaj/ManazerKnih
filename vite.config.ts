import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  server: {
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  }
});
