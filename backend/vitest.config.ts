import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
