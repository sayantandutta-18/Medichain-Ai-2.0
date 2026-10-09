import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';
import { AccessRequest } from '../src/models/AccessRequest.js';
import { User } from '../src/models/User.js';
import { MedicalRecord } from '../src/models/MedicalRecord.js';
import { encrypt } from '../src/utils/crypto.js';
import { sha256 } from '../src/utils/hash.js';
import { AiService } from '../src/services/ai/ai.service.js';
import { WebhookService } from '../src/services/webhook.service.js';

describe('Checkpoint 15: Advanced Features 21–26 & Voice Assistant Integration Suite', () => {
  let mongoServer: MongoMemoryServer;
  let patientToken = '';
  let patientId = '';
  let patientRefreshToken = '';
  let doctorToken = '';
  let doctorId = '';
  let recordId = '';
  let activeSessionId = '';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Register Patient
    const patientReg = await AuthService.register({
      email: 'patient21@test.dev',
      password: 'StrongPassword123!',
      role: 'PATIENT',
      firstName: 'Diana',
      lastName: 'Prince',
    });
    patientId = patientReg.user.id;

    // Login Patient to generate session
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')
      .send({
        email: 'patient21@test.dev',
        password: 'StrongPassword123!',
      });
    patientToken = loginRes.body.tokens.accessToken;
    patientRefreshToken = loginRes.body.tokens.refreshToken;
    activeSessionId = loginRes.body.sessionId;

    // Register Doctor
    const doctorReg = await AuthService.register({
      email: 'doctor21@test.dev',
      password: 'StrongPassword123!',
      role: 'DOCTOR',
      firstName: 'Leonard',
      lastName: 'McCoy',
    });
    doctorToken = doctorReg.tokens.accessToken;
    doctorId = doctorReg.user.id;
    await User.findByIdAndUpdate(doctorId, { verificationStatus: 'VERIFIED' });

    // Seed encrypted medical record
    const dummyContent = 'Comprehensive Metabolic Panel: Glucose 95 mg/dL, normal electrolyte panel.';
    const dummyBuffer = Buffer.from(dummyContent, 'utf-8');
    const dummySha256 = sha256(dummyBuffer);
    const dummyRecordId = new mongoose.Types.ObjectId();
    const aad = `${dummyRecordId.toString()}|${patientId}`;
    const encrypted = encrypt(dummyBuffer, aad);

    const record = await MedicalRecord.create({
      _id: dummyRecordId,
      patientId: new mongoose.Types.ObjectId(patientId),
      title: 'Annual Blood Workup',
      type: 'LAB_REPORT',
      status: 'FINAL',
      encryptedPayload: encrypted,
      sha256: dummySha256,
      keyVersion: 1,
      originalFilename: 'metabolic_panel.txt',
      mimeType: 'text/plain',
      sizeBytes: dummyBuffer.length,
      schemaVersion: 1,
    });
    recordId = record._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Feature 21: Emergency QR Code Access
  it('Feature 21: should generate vector SVG and dataUrl QR code for emergency access', async () => {
    // Authenticated QR generation
    const resAuth = await request(app)
      .get('/api/v1/emergency/qr')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(resAuth.status).toBe(200);
    expect(resAuth.body.status).toBe('SUCCESS');
    expect(resAuth.body.svg).toContain('<svg');
    expect(resAuth.body.svg).toContain('viewBox="0 0 300 300"');
    expect(resAuth.body.dataUrl).toContain('data:image/svg+xml');

    // Public token QR generation (emergency responder access)
    const resPublic = await request(app).get(`/api/v1/emergency/${patientId}/qr`);
    expect(resPublic.status).toBe(200);
    expect(resPublic.body.identifier).toBe(patientId);
    expect(resPublic.body.svg).toContain('<svg');
  });

  // Feature 22: Multilingual AI Medical Summary & Translation
  it('Feature 22: should translate medical record with custom provider fallback and validate schema', async () => {
    const mockProvider = async () =>
      JSON.stringify({
        targetLanguage: 'Spanish',
        translatedTitle: 'Panel Metabólico Completo',
        translatedSummary: 'Los resultados de laboratorio muestran niveles normales de glucosa y electrolitos.',
        translatedFindings: ['Glucosa en sangre dentro de los parámetros esperados.'],
        translatedTerminology: [
          { term: 'Metabolic Panel', translation: 'Panel Metabólico' },
          { term: 'Glucose', translation: 'Glucosa' },
        ],
        disclaimer: 'MediChain-AI translation for information only. Not a medical diagnosis.',
      });

    const result = await AiService.translateRecord(
      recordId,
      'Spanish',
      { userId: patientId, role: 'PATIENT' },
      'req-translate-test',
      mockProvider
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.translation.targetLanguage).toBe('Spanish');
    expect(result.translation.translatedFindings.length).toBeGreaterThan(0);
    expect(result.translation.disclaimer).toBeDefined();

    // Via HTTP endpoint with unauthorized actor rejection
    const unauthRes = await request(app)
      .post(`/api/v1/ai/records/${recordId}/translate`)
      .set('Authorization', `Bearer ${doctorToken}`) // Doctor has no consent yet
      .send({ targetLanguage: 'Spanish' });

    expect(unauthRes.status).toBe(403);
  });

  // Voice AI Assistant Intent Parser & Preview Guardrail (Rule 12)
  it('Voice Assistant: should parse voice commands and enforce explicit confirmation on data changes', async () => {
    // 1. Voice command requesting an action modifying data (e.g. Schedule appointment)
    const resSchedule = await request(app)
      .post('/api/v1/ai/voice/parse-intent')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ transcript: 'Please schedule an appointment with Dr McCoy tomorrow afternoon' });

    expect(resSchedule.status).toBe(200);
    expect(resSchedule.body.status).toBe('SUCCESS');
    expect(resSchedule.body.intent.intent).toBe('SCHEDULE_APPOINTMENT');
    expect(resSchedule.body.intent.requiresConfirmation).toBe(true);
    expect(resSchedule.body.intent.previewData).toBeDefined();

    // 2. Voice command requesting read-only action (Search records)
    const resSearch = await request(app)
      .post('/api/v1/ai/voice/parse-intent')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ transcript: 'Show me my recent blood test reports' });

    expect(resSearch.status).toBe(200);
    expect(resSearch.body.intent.intent).toBe('SEARCH_RECORDS');
    expect(resSearch.body.intent.requiresConfirmation).toBe(false);
  });

  // Feature 23: Dynamic Consent Expiration & Auto-Revocation
  it('Feature 23: should scan and auto-revoke expired consent grants and generate audit trail', async () => {
    // Seed an expired APPROVED consent
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const expiredConsent = await AccessRequest.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      status: 'APPROVED',
      scope: 'VIEW',
      purpose: 'Initial consultation check',
      expiresAt: pastDate,
      schemaVersion: 1,
    });

    // Run expiration check trigger
    const scanRes = await request(app)
      .post('/api/v1/access-requests/expire-check')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(scanRes.status).toBe(200);
    expect(scanRes.body.expiredCount).toBeGreaterThanOrEqual(1);
    expect(scanRes.body.expiredIds).toContain(expiredConsent._id.toString());

    // Verify database document transitioned to EXPIRED
    const updated = await AccessRequest.findById(expiredConsent._id);
    expect(updated?.status).toBe('EXPIRED');
  });

  // Feature 24: Medical Event Webhooks & Cryptographic HMAC Verification
  it('Feature 24: should register webhook, calculate HMAC-SHA256 signature, and test dispatch', async () => {
    // 1. Register subscription
    const regRes = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        url: 'https://example-health-portal.org/webhook',
        events: ['RECORD_CREATED', 'PRESCRIPTION_ISSUED'],
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.subscription.url).toBe('https://example-health-portal.org/webhook');
    expect(regRes.body.subscription.secret).toMatch(/^whsec_/);
    const subId = regRes.body.subscription.id;
    const secret = regRes.body.subscription.secret;

    // 2. List subscriptions (verify secret is masked)
    const listRes = await request(app)
      .get('/api/v1/webhooks')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.subscriptions.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.subscriptions[0].maskedSecret).toContain('...');

    // 3. Test ping delivery with HMAC signature verification
    const testRes = await request(app)
      .post(`/api/v1/webhooks/${subId}/test`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(testRes.status).toBe(200);
    const delivery = testRes.body.delivery;
    expect(delivery.headers['X-MediChain-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);

    // Cryptographic verification of the HMAC signature
    const payloadStr = JSON.stringify(delivery.payload);
    const expectedSig = WebhookService.computeSignature(payloadStr, secret);
    expect(delivery.headers['X-MediChain-Signature']).toBe(`sha256=${expectedSig}`);

    // 4. Delete webhook
    const delRes = await request(app)
      .delete(`/api/v1/webhooks/${subId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(delRes.status).toBe(200);
  });

  // Feature 25: Patient Health Record Comprehensive Dossier Export
  it('Feature 25: should export comprehensive health dossier with SHA-256 integrity checksum', async () => {
    const res = await request(app)
      .get('/api/v1/export/health-summary')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.dossier).toBeDefined();
    expect(res.body.dossier.patient.email).toBe('patient21@test.dev');
    expect(res.body.dossier.medicalRecords.length).toBeGreaterThanOrEqual(1);
    expect(res.body.integrityHash).toMatch(/^[a-f0-9]{64}$/);

    // Verify dossier integrity checksum calculation
    const computedHash = sha256(JSON.stringify(res.body.dossier));
    expect(res.body.integrityHash).toBe(computedHash);
  });

  // Feature 26: Multi-Device User Session Management & Remote Revocation
  it('Feature 26: should list active sessions and block token renewal upon remote revocation', async () => {
    // 1. List active sessions
    const sessionsRes = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.sessions.length).toBeGreaterThanOrEqual(1);
    const targetSession = sessionsRes.body.sessions[0];
    expect(targetSession.sessionId).toBeDefined();
    expect(targetSession.deviceType).toBe('Mobile');

    // 2. Remotely revoke target session
    const revokeRes = await request(app)
      .post(`/api/v1/auth/sessions/${targetSession.sessionId}/revoke`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.message).toBe('Session revoked successfully');

    // 3. Attempt to refresh tokens using the revoked session's token -> MUST BE BLOCKED
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: patientRefreshToken });

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toContain('revoked');
  });
});
