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
      JWT_SECRET: 'test_jwt_secret_at_least_48_bytes_long_for_security_checks_12345',
      JWT_EXPIRES_IN: '15m',
      ENCRYPTION_KEY: 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=',
    },
  },
});
