/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'strip-localhost-plugin',
      renderChunk(code) {
        return code.replace(/localhost/g, '127.0.0.1');
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: [path.resolve(__dirname, 'src/setupTests.ts')],
  },
});
