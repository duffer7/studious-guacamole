import path from 'path';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    host: true, // слушать 0.0.0.0, чтобы открывалось с других устройств (телефон)
    proxy: {
      '/api': {
        target: 'http://backend:3000', // в docker-compose фронт ходит к бэку по имени сервиса
        changeOrigin: true,
        ws: true, // проксировать WebSocket (socket.io /chat)
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  plugins: [
    basicSsl(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      '@': path.resolve(__dirname, 'src'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@features': path.resolve(__dirname, 'src/features'),

      '@components': path.resolve(__dirname, 'src/components'),
      '@ui': path.resolve(__dirname, 'src/components/ui'),
      '@lib': path.resolve(__dirname, 'src/components/lib'),
      '@hooks': path.resolve(__dirname, 'src/components/hooks'),
      '@utils': path.resolve(__dirname, 'src/components/utils'),
    },
  },
});
