import path from "path";
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "components"),
      "@ui": path.resolve(__dirname, "components/ui"),
      "@lib": path.resolve(__dirname, "components/lib"),
      "@hooks": path.resolve(__dirname, "components/hooks"),
      "@utils": path.resolve(__dirname, "components/lib/utils"),
    },
  }
})
