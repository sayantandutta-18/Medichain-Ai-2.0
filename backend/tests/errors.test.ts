import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { app } from '../src/app.js';
import { requestIdMiddleware } from '../src/middleware/requestId.js';
import { centralErrorHandler } from '../src/middleware/errorHandler.js';

describe('Error Handling and Request ID Middleware', () => {
  it('returns 404 with requestId and no stack on non-existent route', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.requestId).toBeDefined();
    expect(typeof res.body.requestId).toBe('string');
    expect(res.body.requestId.length).toBeGreaterThan(0);
    // Explicitly verify stack is never leaked to client (Master Rule 10)
    expect(res.body.stack).toBeUndefined();
  });

  it('preserves client-supplied X-Request-Id header in 404 response', async () => {
    const customId = 'test-client-uuid-12345';
    const res = await request(app)
      .get('/api/v1/does-not-exist')
      .set('X-Request-Id', customId);

    expect(res.status).toBe(404);
    expect(res.body.requestId).toBe(customId);
    expect(res.headers['x-request-id']).toBe(customId);
    expect(res.body.stack).toBeUndefined();
  });

  it('returns central error response with requestId and no stack for 500 errors', async () => {
    const testApp = express();
    testApp.use(requestIdMiddleware);
    testApp.get('/error-test', () => {
      throw new Error('Secret database failure internal stack leak test');
    });
    testApp.use(centralErrorHandler);

    const res = await request(testApp).get('/error-test');

    expect(res.status).toBe(500);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.stack).toBeUndefined();
    // Verify client error message does not expose internal failure detail
    expect(res.body.message).not.toContain('Secret database failure');
  });
});
