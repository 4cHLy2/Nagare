import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, open: true }, // 5173 is always taken by something else
  // never inline font slices as data: urls. keeps css small and font-src 'self' working
  build: { assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined) },
});
