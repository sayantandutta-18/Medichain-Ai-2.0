import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';
import { NotificationService } from '../src/services/notification.service.js';
import { MedicalRecord } from '../src/models/MedicalRecord.js';
import { User } from '../src/models/User.js';

describe('Checkpoint 13: Advanced Features 01–10 Integration Suite', () => {
  let mongoServer: MongoMemoryServer;
  let patientToken = '';
  let patientId = '';
  let doctorToken = '';
  let doctorId = '';
  let adminToken = '';
  let adminId = '';
  let testRecordId = '';
  let testRecordIdB = '';

  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF');
  const validPdfBufferB = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Unique "RecordB" >>\nendobj\ntrailer\n<< >>\n%%EOF');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 1. Create Patient
    const patient = await AuthService.register({
      email: 'patient.adv@test.dev',
      password: 'StrongPassword123!',
      role: 'PATIENT',
      firstName: 'Alice',
      lastName: 'Smith',
    });
    patientToken = patient.tokens.accessToken;
    patientId = patient.user.id;

    // 2. Create Doctor
    const doctor = await AuthService.register({
      email: 'doctor.adv@test.dev',
      password: 'StrongPassword123!',
      role: 'DOCTOR',
      firstName: 'Bob',
      lastName: 'Jones',
    });
    doctorToken = doctor.tokens.accessToken;
    doctorId = doctor.user.id;

    // 3. Create Admin
    const admin = await AuthService.register({
      email: 'admin.adv@test.dev',
      password: 'StrongPassword123!',
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'Super',
    });
    adminToken = admin.tokens.accessToken;
    adminId = admin.user.id;

    // 4. Upload initial medical record for patient
    const uploadResA = await request(app)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`)
      .attach('file', validPdfBuffer, { filename: 'blood_test_2025.pdf', contentType: 'application/pdf' })
      .field('title', 'Blood Test 2025')
      .field('type', 'LAB_REPORT');
    testRecordId = uploadResA.body.record.id || uploadResA.body.record._id;

    const uploadResB = await request(app)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`)
      .attach('file', validPdfBufferB, { filename: 'blood_test_2026.pdf', contentType: 'application/pdf' })
      .field('title', 'Blood Test 2026')
      .field('type', 'LAB_REPORT');
    testRecordIdB = uploadResB.body.record.id || uploadResB.body.record._id;
  }, 300000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // Feature 01: Doctor Verification Workflow
  describe('Feature 01: Doctor Verification Workflow', () => {
    it('doctor registers with PENDING status; admin views pending doctors and approves', async () => {
      // Pending doctors list by Admin
      const pendingRes = await request(app)
        .get('/api/v1/admin/doctors/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.doctors.some((d: any) => d._id === doctorId)).toBe(true);

      // Approve doctor
      const approveRes = await request(app)
        .post(`/api/v1/admin/doctors/${doctorId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.doctor.verificationStatus).toBe('VERIFIED');

      // Verify in DB
      const updatedDoctor = await User.findById(doctorId);
      expect(updatedDoctor?.verificationStatus).toBe('VERIFIED');
    });

    it('rejects non-admin access to doctor verification endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/doctors/pending')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.status).toBe(403);
    });
  });

  // Feature 02: In-App Notifications
  describe('Feature 02: Notification System', () => {
    it('creates and lists notifications, then marks them as read', async () => {
      await NotificationService.notify({
        recipientId: patientId,
        type: 'ACCESS_REQUEST',
        title: 'Consent Requested',
        message: 'Dr. Jones requested access to your records.',
      });

      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.notifications.length).toBeGreaterThanOrEqual(1);
      const notifId = listRes.body.notifications[0]._id;

      // Mark single read
      const readRes = await request(app)
        .post(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(readRes.status).toBe(200);

      // Mark all read
      const readAllRes = await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(readAllRes.status).toBe(200);
    });
  });

  // Feature 03: Emergency Health Card
  describe('Feature 03: Emergency Health Card', () => {
    let emergencyToken = '';

    it('patient updates emergency card and accesses it via public allow-list endpoint', async () => {
      const saveRes = await request(app)
        .post('/api/v1/emergency/card')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          bloodGroup: 'O+',
          allergies: ['Penicillin', 'Peanuts'],
          emergencyContacts: [{ name: 'Emergency Contact', relationship: 'Spouse', phoneNumber: '+1234567890' }],
          conditionsSummary: 'Asthmatic',
        });
      expect(saveRes.status).toBe(200);
      expect(saveRes.body.card.bloodGroup).toBe('O+');
      emergencyToken = saveRes.body.emergencyToken;
      expect(emergencyToken).toBeDefined();

      // Read authenticated card
      const getRes = await request(app)
        .get('/api/v1/emergency/card')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.card.allergies).toContain('Penicillin');

      // Public access without auth
      const publicRes = await request(app).get(`/api/v1/emergency/public/${emergencyToken}`);
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.bloodGroup).toBe('O+');
      expect(publicRes.body.data.allergies).toContain('Peanuts');
      expect(publicRes.body.data.encryptedPayload).toBeUndefined(); // Never leaks raw medical records (Rule 7)
    });
  });

  // Feature 04: Patient Share Links
  describe('Feature 04: Patient Share Links', () => {
    let rawToken = '';

    it('creates single-use share link, views shared record once, and rejects second view', async () => {
      const shareRes = await request(app)
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          recordId: testRecordId,
          expiresInMinutes: 60,
          singleUse: true,
        });
      expect(shareRes.status).toBe(201);
      rawToken = shareRes.body.shareLink.token;
      expect(rawToken).toBeDefined();

      // View by public token
      const viewRes = await request(app).get(`/api/v1/shares/view/${rawToken}`);
      expect(viewRes.status).toBe(200);
      expect(viewRes.body.record.title).toBe('Blood Test 2025');
      expect(viewRes.body.verificationStatus).toBe('VERIFIED');

      // Second view must be rejected because singleUse was true
      const secondView = await request(app).get(`/api/v1/shares/view/${rawToken}`);
      expect(secondView.status).toBe(403);
    });
  });

  // Feature 05: Medical Timeline View
  describe('Feature 05: Medical Timeline View', () => {
    it('groups records chronologically by year', async () => {
      const timelineRes = await request(app)
        .get('/api/v1/records/timeline')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(timelineRes.status).toBe(200);
      expect(Array.isArray(timelineRes.body.timeline)).toBe(true);
      expect(timelineRes.body.timeline.length).toBeGreaterThan(0);
      expect(timelineRes.body.timeline[0].records.length).toBeGreaterThan(0);
    });
  });

  // Feature 06: Health Analytics & Vitals Tracker
  describe('Feature 06: Health Analytics & Vitals Tracker', () => {
    it('logs vitals and calculates pure user statistics', async () => {
      await request(app)
        .post('/api/v1/analytics/metrics')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ type: 'HEART_RATE', value: 72, unit: 'bpm' });

      await request(app)
        .post('/api/v1/analytics/metrics')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ type: 'HEART_RATE', value: 80, unit: 'bpm' });

      const summaryRes = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(summaryRes.status).toBe(200);
      const hrSummary = summaryRes.body.metrics.find((m: any) => m.type === 'HEART_RATE');
      expect(hrSummary).toBeDefined();
      expect(hrSummary.count).toBe(2);
      expect(hrSummary.min).toBe(72);
      expect(hrSummary.max).toBe(80);
      expect(hrSummary.average).toBe(76);
    });
  });

  // Feature 09: Blockchain Explorer
  describe('Feature 09: Blockchain Explorer', () => {
    it('returns anchored record digests and network information', async () => {
      const expRes = await request(app)
        .get('/api/v1/blockchain/explorer')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(expRes.status).toBe(200);
      expect(expRes.body.status).toBe('SUCCESS');
      expect(expRes.body.records).toBeDefined();
      expect(expRes.body.stats.totalRecords).toBeGreaterThan(0);
    });
  });

  // Feature 10: Medical Record Versioning
  describe('Feature 10: Medical Record Versioning', () => {
    it('uploads a new version, updates currentVersion and archives previous version', async () => {
      const updatedPdfBuffer = Buffer.from('%PDF-1.4\nNew Version Bytes\n%%EOF');

      const versionRes = await request(app)
        .post(`/api/v1/records/${testRecordId}/versions`)
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', updatedPdfBuffer, { filename: 'blood_test_v2.pdf', contentType: 'application/pdf' })
        .field('changeNote', 'Corrected hemogram values');

      expect([200, 201]).toContain(versionRes.status);
      expect(versionRes.body.status).toBe('SUCCESS');
      expect(versionRes.body.currentVersion).toBe(2);

      // List versions
      const listVersionsRes = await request(app)
        .get(`/api/v1/records/${testRecordId}/versions`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(listVersionsRes.status).toBe(200);
      expect(listVersionsRes.body.currentVersion).toBe(2);
      expect(listVersionsRes.body.versions.length).toBe(2);
      expect(listVersionsRes.body.versions.some((v: any) => v.versionNumber === 1)).toBe(true);
      expect(listVersionsRes.body.versions.some((v: any) => v.versionNumber === 2)).toBe(true);
    });
  });
});
