import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

describe('Authentication Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 300000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const testUser = {
    email: 'valid.patient@test.dev',
    password: 'StrongPassword1234!',
    role: 'PATIENT',
    firstName: 'Alice',
    lastName: 'Patient',
  };

  it('rejects registration with password less than 12 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, password: 'Short1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.message).toContain('at least 12 characters');
  });

  it('rejects registration with common password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, password: 'password1234' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.message).toContain('common passwords');
  });

  it('rejects registration with role ADMIN via API', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, role: 'ADMIN' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });

  it('registers a new patient successfully with valid data', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('PATIENT');
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
    // Verify password is never leaked in response
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects duplicate email registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already exists');
  });

  it('rejects login with wrong password with generic error message', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword9999!',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects login with non-existent email with generic error message', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent@test.dev',
      password: 'SomePassword1234!',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  let validAccessToken = '';
  let validRefreshToken = '';

  it('logs in successfully and returns JWT and refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
    expect(res.body.user.lastLoginAt).toBeDefined();

    validAccessToken = res.body.tokens.accessToken;
    validRefreshToken = res.body.tokens.refreshToken;
  });

  it('rejects GET /auth/me when token is missing (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Missing or invalid Authorization header');
  });

  it('rejects GET /auth/me when token is tampered (401)', async () => {
    const tamperedToken = validAccessToken.slice(0, -6) + 'abcdef';
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid or malformed access token');
  });

  it('rejects GET /auth/me when token is expired (401)', async () => {
    const secret = env.JWT_SECRET || 'dev_jwt_secret_min_48_chars_for_local_testing_only_1234567890';
    const expiredToken = jwt.sign(
      { userId: '123456789012345678901234', email: 'test@dev.com', role: 'PATIENT' },
      secret,
      { expiresIn: '-1s', issuer: 'medichain-api', audience: 'medichain-client' }
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('expired');
  });

  it('fetches profile with valid JWT on GET /auth/me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('PATIENT');
  });

  it('refreshes token pair and rotates refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: validRefreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();

    const newAccessToken = res.body.tokens.accessToken;
    const newRefreshToken = res.body.tokens.refreshToken;

    // Previous refresh token is now rotated out and must fail
    const oldRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: validRefreshToken,
    });
    expect(oldRes.status).toBe(401);

    // Update valid tokens
    validAccessToken = newAccessToken;
    validRefreshToken = newRefreshToken;
  });

  it('revokes refresh token upon logout', async () => {
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(logoutRes.status).toBe(200);

    // Subsequent refresh attempts must fail
    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: validRefreshToken,
    });
    expect(refreshRes.status).toBe(401);
  });
});
