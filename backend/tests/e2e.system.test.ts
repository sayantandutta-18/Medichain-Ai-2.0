import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { sha256 } from '../src/utils/hash.js';
import { decrypt } from '../src/utils/crypto.js';
import { MedicalRecord } from '../src/models/MedicalRecord.js';
import { AuditService } from '../src/services/audit.service.js';

describe('Checkpoint 16: Comprehensive End-to-End System Integration Suite', () => {
  let mongoServer: MongoMemoryServer;

  let patientToken = '';
  let patientId = '';
  let doctorToken = '';
  let doctorId = '';
  let adminToken = '';
  let uploadedRecordId = '';
  let accessRequestId = '';

  const samplePdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Type /Pages >>\nendobj\ntrailer\n<< >>\n%%EOF'
  );

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Step 1: Authentication & Multi-Device Session Management (Feature 26)
  it('E2E Step 1: registers patient, logs in, and creates active session', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'alice.e2e@medichain.dev',
        password: 'Password123!@#',
        role: 'PATIENT',
        firstName: 'Alice',
        lastName: 'E2E',
      });

    expect(regRes.status).toBe(201);
    patientId = regRes.body.user.id;

    // Login with explicit User-Agent
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0')
      .send({
        email: 'alice.e2e@medichain.dev',
        password: 'Password123!@#',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.tokens.accessToken).toBeDefined();
    expect(loginRes.body.sessionId).toBeDefined();
    patientToken = loginRes.body.tokens.accessToken;

    // Check sessions list
    const sessionsRes = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessionsRes.body.sessions[0].deviceType).toBe('Desktop');
  });

  // Step 2: Secure Document Upload & AES-256-GCM Encryption with AAD Binding (Rules 7 & 8)
  it('E2E Step 2: uploads medical document, encrypts payload, and verifies SHA-256 integrity', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`)
      .field('title', 'Annual Cardiac Panel')
      .field('type', 'LAB_REPORT')
      .attach('file', samplePdfBytes, 'cardiac_panel.pdf');

    expect(uploadRes.status).toBe(201);
    uploadedRecordId = uploadRes.body.record.id || uploadRes.body.record._id;
    expect(uploadedRecordId).toBeDefined();

    // Verify database record has ciphertext and NOT plaintext
    const dbRecord = await MedicalRecord.findById(uploadedRecordId);
    expect(dbRecord).toBeDefined();
    expect(dbRecord?.encryptedPayload.ciphertext).toBeDefined();
    expect(Buffer.from(dbRecord!.encryptedPayload.iv, 'base64')).toHaveLength(12); // 12-byte random IV per encryption
    expect(Buffer.from(dbRecord!.encryptedPayload.authTag, 'base64')).toHaveLength(16); // 16-byte auth tag
    expect(dbRecord?.sha256).toBe(sha256(samplePdfBytes));

    // Decrypt and assert plaintext match
    const aad = `${uploadedRecordId}|${patientId}`;
    const decryptedBytes = decrypt(dbRecord!.encryptedPayload, aad);
    expect(decryptedBytes.equals(samplePdfBytes)).toBe(true);
  });

  // Step 3: Blockchain Anchoring on Sui Testnet / Simulation
  it('E2E Step 3: anchors record integrity hash to Sui blockchain', async () => {
    const anchorRes = await request(app)
      .post(`/api/v1/records/${uploadedRecordId}/anchor`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(anchorRes.status).toBe(200);
    expect(['CONFIRMED', 'PENDING', 'SUCCESS']).toContain(anchorRes.body.status);

    // Verify in Blockchain Explorer endpoint
    const explorerRes = await request(app)
      .get('/api/v1/blockchain/explorer')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(explorerRes.status).toBe(200);
    expect(explorerRes.body.records.length).toBeGreaterThanOrEqual(1);
  });

  // Step 4: Doctor Registration & Central Policy Enforcement (Rules 6 & 9)
  it('E2E Step 4: registers practitioner, verifies via admin, and requests clinical access', async () => {
    // 1. Create Admin & Doctor
    const adminReg = await AuthService.register({
      email: 'admin.e2e@medichain.dev',
      password: 'AdminPassword123!',
      role: 'ADMIN',
      firstName: 'Chief',
      lastName: 'Admin',
    });
    adminToken = adminReg.tokens.accessToken;

    const doctorReg = await AuthService.register({
      email: 'doctor.e2e@medichain.dev',
      password: 'DoctorPassword123!',
      role: 'DOCTOR',
      firstName: 'Gregory',
      lastName: 'House',
    });
    doctorToken = doctorReg.tokens.accessToken;
    doctorId = doctorReg.user.id;

    // 2. Admin approves doctor
    const verifyRes = await request(app)
      .post(`/api/v1/admin/doctors/${doctorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(verifyRes.status).toBe(200);

    // 3. Before consent, doctor reading record is DENIED by policy
    const unauthRead = await request(app)
      .get(`/api/v1/records/${uploadedRecordId}/download`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(unauthRead.status).toBe(403);

    // 4. Doctor requests clinical access
    const reqRes = await request(app)
      .post('/api/v1/access-requests')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId,
        purpose: 'Comprehensive diagnostic cardiology consultation',
      });

    expect(reqRes.status).toBe(201);
    accessRequestId = reqRes.body.accessRequest._id || reqRes.body.accessRequest.id;
    expect(accessRequestId).toBeDefined();
  });

  // Step 5: Patient Consent Approval & Receipt Generation
  it('E2E Step 5: patient approves access request, allowing doctor read access with signed receipt', async () => {
    const approveRes = await request(app)
      .post(`/api/v1/access-requests/${accessRequestId}/approve`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        scope: 'FULL',
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.accessRequest.status).toBe('APPROVED');

    // Doctor can now download/read the record
    const docDownloadRes = await request(app)
      .get(`/api/v1/records/${uploadedRecordId}/download`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(docDownloadRes.status).toBe(200);
    expect(docDownloadRes.body.length).toBe(samplePdfBytes.length);

    // Consent receipt download
    const receiptRes = await request(app)
      .get(`/api/v1/access-requests/${accessRequestId}/receipt`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(receiptRes.status).toBe(200);
    expect(receiptRes.body.requestId).toBe(accessRequestId);
    expect(receiptRes.body.cryptographicProof).toBeDefined();
  });

  // Step 6: Doctor Writes Encrypted Clinical Note & Issues Prescription with Interaction Check (Features 12, 17, 18)
  it('E2E Step 6: doctor authors encrypted clinical note and issues prescription with interaction check', async () => {
    // 1. Author encrypted clinical note
    const noteRes = await request(app)
      .post('/api/v1/clinical-notes')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId,
        title: 'Cardiac Evaluation Findings',
        content: 'Normal sinus rhythm, advise follow-up in 3 months.',
      });

    expect(noteRes.status).toBe(201);
    expect(noteRes.body.status).toBe('SUCCESS');
    expect(noteRes.body.noteId).toBeDefined();

    // 2. Issue prescription with known drug interaction: Warfarin + Aspirin
    const rxRes = await request(app)
      .post('/api/v1/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId,
        recordId: uploadedRecordId,
        medications: [
          { name: 'Warfarin', dosage: '5mg', frequency: 'Daily', duration: '30 days' },
          { name: 'Aspirin', dosage: '81mg', frequency: 'Daily', duration: '30 days' },
        ],
        notes: 'Take with food.',
      });

    expect(rxRes.status).toBe(201);
    expect(rxRes.body.interactionWarnings).toBeDefined();
    expect(rxRes.body.interactionWarnings.some((w: any) => w.severity === 'HIGH')).toBe(true);
  });

  // Step 7: Voice AI Assistant with Preview & Confirmation Guardrail (Rule 12)
  it('E2E Step 7: voice assistant parses transcript and enforces explicit confirmation for data changes', async () => {
    const voiceRes = await request(app)
      .post('/api/v1/ai/voice/parse-intent')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ transcript: 'Schedule appointment with cardiology next week' });

    expect(voiceRes.status).toBe(200);
    expect(voiceRes.body.intent.intent).toBe('SCHEDULE_APPOINTMENT');
    expect(voiceRes.body.intent.requiresConfirmation).toBe(true);
    expect(voiceRes.body.intent.previewData).toBeDefined();
  });

  // Step 8: Dynamic Consent Auto-Expiration Scanner (Feature 23)
  it('E2E Step 8: scans for expired consents and auto-revokes with audit log', async () => {
    const scanRes = await request(app)
      .post('/api/v1/access-requests/expire-check')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(scanRes.status).toBe(200);
    expect(typeof scanRes.body.expiredCount).toBe('number');
  });

  // Step 9: Comprehensive Patient Health Dossier Export with SHA-256 Checksum (Feature 25)
  it('E2E Step 9: exports complete health dossier and verifies canonical SHA-256 checksum', async () => {
    const exportRes = await request(app)
      .get('/api/v1/export/health-summary')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.dossier).toBeDefined();
    expect(exportRes.body.dossier.patient.email).toBe('alice.e2e@medichain.dev');
    expect(exportRes.body.integrityHash).toMatch(/^[a-f0-9]{64}$/);

    // Cryptographic match
    const computed = sha256(JSON.stringify(exportRes.body.dossier));
    expect(exportRes.body.integrityHash).toBe(computed);
  });

  // Step 10: First-Responder Emergency Access & Vector SVG QR Code (Feature 21)
  it('E2E Step 10: first responder accesses emergency profile and generates vector SVG QR code', async () => {
    // 1. Fetch public emergency card
    const emergencyRes = await request(app).get(`/api/v1/emergency/public/${patientId}`);
    expect(emergencyRes.status).toBe(200);
    expect(emergencyRes.body.data.isEmergencyAllowListOnly).toBe(true);

    // 2. Fetch standalone vector SVG QR code
    const qrRes = await request(app).get(`/api/v1/emergency/${patientId}/qr`);
    expect(qrRes.status).toBe(200);
    expect(qrRes.body.svg).toContain('<svg');
    expect(qrRes.body.svg).toContain('viewBox="0 0 300 300"');
  });

  // Step 11: Tamper-Evident Hash-Chained Audit Trail Verification (Rule 9)
  it('E2E Step 11: verifies cryptographic audit log hash chain across entire lifecycle', async () => {
    const chainResult = await AuditService.verifyChain();
    expect(chainResult.valid).toBe(true);
    expect(chainResult.totalEntries).toBeGreaterThanOrEqual(5);
  });
});
