import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    hookTimeout: 300000,
    testTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
