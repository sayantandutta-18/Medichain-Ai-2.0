import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { can, PolicyAction } from '../src/policy/policy.js';
import { User } from '../src/models/User.js';
import { AccessRequest } from '../src/models/AccessRequest.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { AuthService } from '../src/services/auth.service.js';

describe('Authorization Policy Matrix and Consent Lifecycle', () => {
  let mongoServer: MongoMemoryServer;

  const patientAId = new Types.ObjectId().toString();
  const patientBId = new Types.ObjectId().toString();
  const doctorId = new Types.ObjectId().toString();

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

  describe('Policy can() Matrix: Actor x Action x Consent State', () => {
    it('Patient A has full permissions on own record', async () => {
      const actions: PolicyAction[] = ['record:read', 'record:download', 'record:update', 'record:delete', 'record:create'];
      for (const action of actions) {
        const allowed = await can(
          { userId: patientAId, role: 'PATIENT' },
          action,
          { recordPatientId: patientAId }
        );
        expect(allowed, `Expected Patient A to be allowed ${action} on own record`).toBe(true);
      }
    });

    it('Patient A cannot read, download, update, or delete Patient B record (IDOR defense)', async () => {
      const actions: PolicyAction[] = ['record:read', 'record:download', 'record:update', 'record:delete'];
      for (const action of actions) {
        const allowed = await can(
          { userId: patientAId, role: 'PATIENT' },
          action,
          { recordPatientId: patientBId }
        );
        expect(allowed, `Expected Patient A to be DENIED ${action} on Patient B record`).toBe(false);
      }
    });

    it('Doctor can NEVER update or delete any patient record', async () => {
      const updateAllowed = await can(
        { userId: doctorId, role: 'DOCTOR' },
        'record:update',
        { recordPatientId: patientAId }
      );
      const deleteAllowed = await can(
        { userId: doctorId, role: 'DOCTOR' },
        'record:delete',
        { recordPatientId: patientAId }
      );

      expect(updateAllowed).toBe(false);
      expect(deleteAllowed).toBe(false);
    });

    it('Doctor without consent is DENIED read and download', async () => {
      const readAllowed = await can(
        { userId: doctorId, role: 'DOCTOR' },
        'record:read',
        { recordPatientId: patientAId }
      );
      const downloadAllowed = await can(
        { userId: doctorId, role: 'DOCTOR' },
        'record:download',
        { recordPatientId: patientAId }
      );

      expect(readAllowed).toBe(false);
      expect(downloadAllowed).toBe(false);
    });

    it('Doctor with PENDING, REJECTED, EXPIRED, or REVOKED consent is DENIED access', async () => {
      const testCases = [
        { status: 'PENDING', expiresAt: new Date(Date.now() + 86400000) },
        { status: 'REJECTED', expiresAt: new Date(Date.now() + 86400000) },
        { status: 'APPROVED', expiresAt: new Date(Date.now() - 86400000) }, // Expired
        { status: 'REVOKED', expiresAt: new Date(Date.now() + 86400000) },
      ];

      for (const tc of testCases) {
        await AccessRequest.deleteMany({});
        await AccessRequest.create({
          patientId: patientAId,
          doctorId: doctorId,
          status: tc.status as any,
          scope: 'FULL',
          purpose: 'Testing access denial',
          expiresAt: tc.expiresAt,
          schemaVersion: 1,
        });

        const readAllowed = await can(
          { userId: doctorId, role: 'DOCTOR' },
          'record:read',
          { recordPatientId: patientAId }
        );
        const downloadAllowed = await can(
          { userId: doctorId, role: 'DOCTOR' },
          'record:download',
          { recordPatientId: patientAId }
        );

        expect(readAllowed, `Expected ${tc.status} to deny record:read`).toBe(false);
        expect(downloadAllowed, `Expected ${tc.status} to deny record:download`).toBe(false);
      }
    });

    it('Doctor with APPROVED active consent is ALLOWED access per scope', async () => {
      await AccessRequest.deleteMany({});
      await AccessRequest.create({
        patientId: patientAId,
        doctorId: doctorId,
        status: 'APPROVED',
        scope: 'VIEW',
        purpose: 'Clinical consultation',
        expiresAt: new Date(Date.now() + 86400000),
        schemaVersion: 1,
      });

      const viewAllowed = await can(
        { userId: doctorId, role: 'DOCTOR' },
        'record:read',
        { recordPatientId: patientAId }
      );
      const downloadAllowed = await can(
        { userId: doctorId, role: 'DOCTOR' },
        'record:download',
        { recordPatientId: patientAId }
      );

      expect(viewAllowed).toBe(true);
      expect(downloadAllowed).toBe(false); // Scope was VIEW only
    });

    it('Rejects doctor self-request', async () => {
      const selfRequestAllowed = await can(
        { userId: doctorId, role: 'DOCTOR' },
        'access:request',
        { recordPatientId: doctorId, doctorId }
      );
      expect(selfRequestAllowed).toBe(false);
    });
  });

  describe('Consent Lifecycle API & Receipts Integration', () => {
    let patientToken = '';
    let doctorToken = '';
    let patientDocId = '';
    let doctorDocId = '';
    let createdRequestId = '';

    beforeAll(async () => {
      // Create Patient
      const patientReg = await AuthService.register({
        email: 'patient.lifecycle@test.dev',
        password: 'ValidPassword123!',
        role: 'PATIENT',
        firstName: 'TestPatient',
      });
      patientToken = patientReg.tokens.accessToken;
      patientDocId = patientReg.user.id;

      // Create Doctor
      const doctorReg = await AuthService.register({
        email: 'doctor.lifecycle@test.dev',
        password: 'ValidPassword123!',
        role: 'DOCTOR',
        firstName: 'TestDoctor',
      });
      doctorToken = doctorReg.tokens.accessToken;
      doctorDocId = doctorReg.user.id;
    });

    it('Doctor creates an access request with purpose -> 201 and audits ACCESS_REQUESTED', async () => {
      const res = await request(app)
        .post('/api/v1/access-requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: patientDocId,
          purpose: 'Cardiology follow-up assessment',
        });

      expect(res.status).toBe(201);
      expect(res.body.accessRequest.status).toBe('PENDING');
      expect(res.body.accessRequest.purpose).toBe('Cardiology follow-up assessment');
      createdRequestId = res.body.accessRequest._id;

      // Verify audit event
      const audit = await AuditLog.findOne({
        action: 'ACCESS_REQUESTED',
        targetId: createdRequestId,
      });
      expect(audit).toBeDefined();
      expect(audit?.role).toBe('DOCTOR');
    });

    it('Doctor self-request is rejected -> 403', async () => {
      const res = await request(app)
        .post('/api/v1/access-requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: doctorDocId, // Requesting self
          purpose: 'Self inspection',
        });

      expect(res.status).toBe(403);
    });

    it('Patient lists requests and sees pending request -> 200', async () => {
      const res = await request(app)
        .get('/api/v1/access-requests')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBeGreaterThan(0);
      expect(res.body.requests[0]._id).toBe(createdRequestId);
    });

    it('Patient approves request with scope and future expiry -> 200, generates receipt, audits ACCESS_APPROVED', async () => {
      const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
      const res = await request(app)
        .post(`/api/v1/access-requests/${createdRequestId}/approve`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          scope: 'FULL',
          expiresAt: futureDate,
        });

      expect(res.status).toBe(200);
      expect(res.body.accessRequest.status).toBe('APPROVED');
      expect(res.body.receipt).toBeDefined();
      expect(res.body.receipt.scope).toBe('FULL');
      expect(res.body.receipt.cryptographicProof).toBeDefined();

      // Verify audit event
      const audit = await AuditLog.findOne({
        action: 'ACCESS_APPROVED',
        targetId: createdRequestId,
      });
      expect(audit).toBeDefined();
    });

    it('Patient downloads consent receipt JSON -> 200', async () => {
      const res = await request(app)
        .get(`/api/v1/access-requests/${createdRequestId}/receipt`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.body.status).toBe('APPROVED');
      expect(res.body.cryptographicProof).toBeDefined();
    });

    it('Patient revokes active consent -> 200 and audits ACCESS_REVOKED', async () => {
      const res = await request(app)
        .post(`/api/v1/access-requests/${createdRequestId}/revoke`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.accessRequest.status).toBe('REVOKED');

      // Verify audit event
      const audit = await AuditLog.findOne({
        action: 'ACCESS_REVOKED',
        targetId: createdRequestId,
      });
      expect(audit).toBeDefined();
    });

    it('Doctor is denied access after revocation -> policy can() returns false', async () => {
      const allowed = await can(
        { userId: doctorDocId, role: 'DOCTOR' },
        'record:read',
        { recordPatientId: patientDocId }
      );

      expect(allowed).toBe(false);
    });
  });
});
