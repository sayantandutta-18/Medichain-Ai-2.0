import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { AccessRequest } from '../src/models/AccessRequest.js';

describe('Medical Records Pipeline Integration (Checkpoint 5)', () => {
  let mongoServer: MongoMemoryServer;
  let patientToken = '';
  let patientId = '';
  let doctorToken = '';
  let doctorId = '';
  let uploadedRecordId = '';

  // Valid synthetic PDF buffer starting with %PDF- header
  const validPdfBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF'),
  ]);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register Patient
    const patient = await AuthService.register({
      email: 'records.patient@test.dev',
      password: 'StrongPassword123!',
      role: 'PATIENT',
      firstName: 'RecordsPatient',
    });
    patientToken = patient.tokens.accessToken;
    patientId = patient.user.id;

    // Register Doctor
    const doctor = await AuthService.register({
      email: 'records.doctor@test.dev',
      password: 'StrongPassword123!',
      role: 'DOCTOR',
      firstName: 'RecordsDoctor',
    });
    doctorToken = doctor.tokens.accessToken;
    doctorId = doctor.user.id;
  }, 300000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('rejects uploads with unsupported MIME types (MIME allow-list check)', async () => {
    const res = await request(app)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`)
      .attach('file', Buffer.from('console.log("bad");'), {
        filename: 'malicious.js',
        contentType: 'application/javascript',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Unsupported file type');
  });

  it('rejects renamed non-PDF files via magic-byte signature check', async () => {
    const fakePdfBytes = Buffer.from('This is actually plain text disguised as a PDF file.');
    const res = await request(app)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`)
      .attach('file', fakePdfBytes, {
        filename: 'spoofed.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('magic bytes signature does not match');
  });

  it('uploads a valid synthetic PDF successfully and creates RECORD_CREATED audit log', async () => {
    const res = await request(app)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`)
      .field('title', 'Annual Blood Chemistry Report')
      .field('type', 'LAB_REPORT')
      .attach('file', validPdfBuffer, {
        filename: 'blood-report.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.record).toBeDefined();
    expect(res.body.record.title).toBe('Annual Blood Chemistry Report');
    expect(res.body.record.sha256).toBeDefined();
    // Verify ciphertext bytes are not exposed in metadata response
    expect(res.body.record.encryptedPayload).toBeUndefined();

    uploadedRecordId = res.body.record.id;

    // Check audit event
    const audit = await AuditLog.findOne({
      action: 'RECORD_CREATED',
      targetId: uploadedRecordId,
    });
    expect(audit).toBeDefined();
    expect(audit?.actorId.toString()).toBe(patientId);
  });

  it('detects and rejects duplicate file upload for the same patient (409)', async () => {
    const res = await request(app)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`)
      .field('title', 'Duplicate Blood Chemistry Report')
      .attach('file', validPdfBuffer, {
        filename: 'blood-report-duplicate.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Duplicate document detected');
  });

  it('denies doctor download when consent is not granted (403) and audits denied attempt', async () => {
    const res = await request(app)
      .get(`/api/v1/records/${uploadedRecordId}/download`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('permission');

    // Verify denied attempt is audited
    const deniedAudit = await AuditLog.findOne({
      action: 'RECORD_DOWNLOAD_DENIED',
      targetId: uploadedRecordId,
    });
    expect(deniedAudit).toBeDefined();
    expect(deniedAudit?.actorId.toString()).toBe(doctorId);
  });

  it('allows doctor download after patient grants consent with DOWNLOAD/FULL scope', async () => {
    // Grant consent to doctor
    await AccessRequest.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      status: 'APPROVED',
      scope: 'FULL',
      purpose: 'Emergency review',
      expiresAt: new Date(Date.now() + 86400000),
      schemaVersion: 1,
    });

    const res = await request(app)
      .get(`/api/v1/records/${uploadedRecordId}/download`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.toString()).toBe(validPdfBuffer.toString());
  });

  it('allows patient download of own record returning original decrypted bytes', async () => {
    const res = await request(app)
      .get(`/api/v1/records/${uploadedRecordId}/download`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.toString()).toBe(validPdfBuffer.toString());

    // Verify download audit
    const downloadAudit = await AuditLog.findOne({
      action: 'RECORD_DOWNLOADED',
      targetId: uploadedRecordId,
      actorId: patientId,
    });
    expect(downloadAudit).toBeDefined();
  });

  it('blocks doctor from updating record metadata (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/records/${uploadedRecordId}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ title: 'Doctor Tampered Title' });

    expect(res.status).toBe(403);
  });

  it('blocks doctor from deleting record (403)', async () => {
    const res = await request(app)
      .delete(`/api/v1/records/${uploadedRecordId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
  });

  it('allows patient to soft delete record and excludes it from standard list', async () => {
    const deleteRes = await request(app)
      .delete(`/api/v1/records/${uploadedRecordId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(deleteRes.status).toBe(200);

    // List records must now be empty
    const listRes = await request(app)
      .get('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.records.length).toBe(0);
  });
});
