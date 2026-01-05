import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        widget: path.resolve(__dirname, 'public/widgets/widget-chat.html'),
        embed: path.resolve(__dirname, 'embed.html')
      }
    }
  },
  server: {
    port: 5173,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 100
    },
    // 🔓 Povolení iframe embeddingu pro všechny domény
    headers: {
      // Povolí vložení do iframe z jakékoliv domény
      'Content-Security-Policy': "frame-ancestors *",
      // Alternativně můžeš povolit jen specifické domény:
      // 'Content-Security-Policy': "frame-ancestors 'self' https://klient-domena.cz",
    }
  }
});
