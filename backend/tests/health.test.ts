import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('System Health & Diagnostics Endpoints', () => {
  it('GET /api/v1/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/v1/health/live returns 200 with uptime and status live', async () => {
    const res = await request(app).get('/api/v1/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('live');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET /api/v1/health/ready returns subsystems health diagnostics', async () => {
    const res = await request(app).get('/api/v1/health/ready');

    expect([200, 503]).toContain(res.status);
    expect(res.body.subsystems).toBeDefined();
    expect(res.body.subsystems.cryptography).toBeDefined();
    expect(res.body.subsystems.cryptography.cipher).toBe('AES-256-GCM');
    expect(res.body.subsystems.blockchainAnchor).toBeDefined();
  });
});
