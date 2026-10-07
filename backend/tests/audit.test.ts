import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { AuditService } from '../src/services/audit.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { User } from '../src/models/User.js';

describe('Audit Trail & Cryptographic Hash-Chain Verification (Checkpoint 7)', () => {
  let mongoServer: MongoMemoryServer;
  let patientAToken = '';
  let patientAId = '';
  let patientBToken = '';
  let patientBId = '';
  let adminToken = '';
  let adminId = '';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Clear any previous logs
    await AuditLog.deleteMany({});

    // Register Patient A
    const patA = await AuthService.register({
      email: 'patient.audit.a@test.dev',
      password: 'StrongPassword123!',
      role: 'PATIENT',
      firstName: 'AuditPatientA',
    });
    patientAToken = patA.tokens.accessToken;
    patientAId = patA.user.id;

    // Register Patient B
    const patB = await AuthService.register({
      email: 'patient.audit.b@test.dev',
      password: 'StrongPassword123!',
      role: 'PATIENT',
      firstName: 'AuditPatientB',
    });
    patientBToken = patB.tokens.accessToken;
    patientBId = patB.user.id;

    // Create Admin user in DB
    const adminUser = await User.create({
      email: 'admin.auditor@test.dev',
      passwordHash: 'dummy_admin_hash_12345',
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Admin',
      schemaVersion: 1,
    });
    adminId = adminUser._id.toString();
    adminToken = AuthService.generateAccessToken({
      userId: adminId,
      email: adminUser.email,
      role: 'ADMIN',
    });
  }, 300000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('records actorId, action, requestId, and valid timestamp for sensitive events', async () => {
    const entry = await AuditService.record({
      actorId: patientAId,
      role: 'PATIENT',
      action: 'RECORD_VIEWED',
      targetId: 'record-test-1',
      requestId: 'req-view-1234',
    });

    expect(entry.actorId.toString()).toBe(patientAId);
    expect(entry.action).toBe('RECORD_VIEWED');
    expect(entry.requestId).toBe('req-view-1234');
    expect(entry.createdAt).toBeInstanceOf(Date);
    expect(entry.prevHash).toBeDefined();
    expect(entry.hash).toBeDefined();
  });

  it('links entries sequentially into a tamper-evident cryptographic hash chain', async () => {
    const entry1 = await AuditService.record({
      actorId: patientAId,
      role: 'PATIENT',
      action: 'RECORD_CREATED',
      targetId: 'record-test-2',
      requestId: 'req-chain-1',
    });

    const entry2 = await AuditService.record({
      actorId: patientAId,
      role: 'PATIENT',
      action: 'RECORD_DOWNLOADED',
      targetId: 'record-test-2',
      requestId: 'req-chain-2',
    });

    expect(entry2.prevHash).toBe(entry1.hash);
  });

  it('verifies untouched hash chain passes successfully with valid: true', async () => {
    const verifyResult = await AuditService.verifyChain();
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.totalEntries).toBeGreaterThan(0);
  });

  it('enforces scoped audit retrieval: Patient A never sees Patient B entries (IDOR test)', async () => {
    // Generate event for Patient B
    await AuditService.record({
      actorId: patientBId,
      role: 'PATIENT',
      action: 'RECORD_CREATED',
      targetId: 'record-patient-b',
      requestId: 'req-b-1',
    });

    // Patient A calls /audit/me
    const resA = await request(app)
      .get('/api/v1/audit/me')
      .set('Authorization', `Bearer ${patientAToken}`);

    expect(resA.status).toBe(200);
    expect(resA.body.logs.length).toBeGreaterThan(0);
    const hasAnyPatientBLogs = resA.body.logs.some(
      (log: any) => log.actorId === patientBId
    );
    expect(hasAnyPatientBLogs).toBe(false);

    // Patient B calls /audit/me
    const resB = await request(app)
      .get('/api/v1/audit/me')
      .set('Authorization', `Bearer ${patientBToken}`);

    expect(resB.status).toBe(200);
    const allPatientB = resB.body.logs.every(
      (log: any) => log.actorId === patientBId
    );
    expect(allPatientB).toBe(true);
  });

  it('restricts /audit/verify endpoint to ADMIN callers only (403 for non-admin)', async () => {
    const deniedRes = await request(app)
      .get('/api/v1/audit/verify')
      .set('Authorization', `Bearer ${patientAToken}`);

    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.message).toContain('Admin');

    const adminRes = await request(app)
      .get('/api/v1/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.valid).toBe(true);
  });

  it('detects tampering when an audit document action is manually modified in database', async () => {
    // Find an existing log entry
    const entryToTamper = await AuditLog.findOne({ action: 'RECORD_VIEWED' });
    expect(entryToTamper).toBeDefined();

    // Directly tamper document in DB bypassing AuditService
    await AuditLog.updateOne(
      { _id: entryToTamper!._id },
      { $set: { action: 'RECORD_DELETED_UNAUTHORIZED' } }
    );

    const tamperedResult = await AuditService.verifyChain();
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.logId).toBe(entryToTamper!._id.toString());
    expect(tamperedResult.reason).toContain('tampered');
  });

  it('ensures no sensitive content (passwords, tokens, full medical text) is recorded in audit metadata', async () => {
    const sanitizedEntry = await AuditService.record({
      actorId: patientAId,
      role: 'PATIENT',
      action: 'LOGIN',
      requestId: 'req-clean-1',
      metadata: {
        password: 'AttemptedPasswordLeak123!',
        token: 'secret_jwt_bearer_token',
        medicalReportContent: 'Sensitive diagnostic medical text',
        safeMetadataKey: 'value_ok',
      },
    });

    expect(sanitizedEntry.metadata?.password).toBeUndefined();
    expect(sanitizedEntry.metadata?.token).toBeUndefined();
    expect(sanitizedEntry.metadata?.medicalReportContent).toBeUndefined();
    expect(sanitizedEntry.metadata?.safeMetadataKey).toBe('value_ok');
  });
});
