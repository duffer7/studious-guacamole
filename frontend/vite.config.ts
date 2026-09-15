import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@pages': path.resolve(__dirname, 'src/pages'),

      '@components': path.resolve(__dirname, 'src/components'),
      '@ui': path.resolve(__dirname, 'src/components/ui'),
      '@lib': path.resolve(__dirname, 'src/components/lib'),
      '@hooks': path.resolve(__dirname, 'src/components/hooks'),
      '@utils': path.resolve(__dirname, 'src/components/utils'),
    },
  },
});
