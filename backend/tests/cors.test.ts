import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, isOriginAllowed } from '../src/app.js';

describe('CORS and Route Prefix Integration', () => {
  describe('isOriginAllowed Helper', () => {
    const allowed = [
      'http://localhost:5173',
      'https://medichain-ai-2-0-7sbp.vercel.app',
      'https://medichain-ai-2-0*.vercel.app',
    ];

    it('allows undefined or null origin (server-to-server / curl)', () => {
      expect(isOriginAllowed(undefined, allowed)).toBe(true);
      expect(isOriginAllowed('', allowed)).toBe(true);
    });

    it('allows exact localhost origin with and without trailing slash', () => {
      expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
      expect(isOriginAllowed('http://localhost:5173/', allowed)).toBe(true);
    });

    it('allows exact production Vercel frontend origin', () => {
      expect(isOriginAllowed('https://medichain-ai-2-0-7sbp.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://medichain-ai-2-0-7sbp.vercel.app/', allowed)).toBe(true);
    });

    it('allows wildcard Vercel preview domains', () => {
      expect(isOriginAllowed('https://medichain-ai-2-0-preview-1.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://medichain-ai-2-0-git-main.vercel.app', allowed)).toBe(true);
    });

    it('rejects unallowed origin', () => {
      expect(isOriginAllowed('https://malicious-site.example.com', allowed)).toBe(false);
      expect(isOriginAllowed('https://other-vercel-app.vercel.app', allowed)).toBe(false);
    });

    it('supports global wildcard when configured', () => {
      expect(isOriginAllowed('https://anything.com', ['*'])).toBe(true);
    });
  });

  describe('CORS Headers on Express Application', () => {
    it('sets Access-Control-Allow-Origin matching production Vercel domain', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://medichain-ai-2-0-7sbp.vercel.app');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://medichain-ai-2-0-7sbp.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('handles OPTIONS preflight for production Vercel domain', async () => {
      const res = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'https://medichain-ai-2-0-7sbp.vercel.app')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('https://medichain-ai-2-0-7sbp.vercel.app');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });

    it('denies requests from unauthorized origins with 403 CorsForbidden', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://unauthorized-attacker-site.com');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('CorsForbidden');
      expect(res.body.message).toContain('CORS');
    });
  });

  describe('Route Prefix Compatibility Fallback', () => {
    it('allows requests to /health without /api/v1 prefix', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('allows requests to /health/ready without /api/v1 prefix', async () => {
      const res = await request(app).get('/health/ready');
      expect([200, 503]).toContain(res.status);
      expect(res.body.subsystems).toBeDefined();
    });

    it('preserves 404 for unknown routes that are not in known API groups', async () => {
      const res = await request(app).get('/completely-unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });
});
