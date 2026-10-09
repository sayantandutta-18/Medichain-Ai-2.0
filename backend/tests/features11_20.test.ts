import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';
import { AccessRequest } from '../src/models/AccessRequest.js';
import { User } from '../src/models/User.js';

describe('Checkpoint 14: Advanced Features 11–20 Integration Suite', () => {
  let mongoServer: MongoMemoryServer;
  let patientToken = '';
  let patientId = '';
  let doctorToken = '';
  let doctorId = '';
  let caregiverToken = '';
  let caregiverId = '';
  let caregiverEmail = 'caregiver@test.dev';
  let createdGoalId = '';
  let createdAppointmentId = '';
  let createdPrescriptionId = '';

  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 1. Create Patient
    const patient = await AuthService.register({
      email: 'patient14@test.dev',
      password: 'StrongPassword123!',
      role: 'PATIENT',
      firstName: 'Alice',
      lastName: 'Wonder',
    });
    patientToken = patient.tokens.accessToken;
    patientId = patient.user.id;

    // 2. Create Doctor (verified)
    const doctor = await AuthService.register({
      email: 'doctor14@test.dev',
      password: 'StrongPassword123!',
      role: 'DOCTOR',
      firstName: 'Gregory',
      lastName: 'House',
    });
    doctorToken = doctor.tokens.accessToken;
    doctorId = doctor.user.id;
    await User.findByIdAndUpdate(doctorId, { verificationStatus: 'VERIFIED' });

    // 3. Create Caregiver user
    const caregiver = await AuthService.register({
      email: caregiverEmail,
      password: 'StrongPassword123!',
      role: 'PATIENT',
      firstName: 'Bob',
      lastName: 'Care',
    });
    caregiverToken = caregiver.tokens.accessToken;
    caregiverId = caregiver.user.id;

    // 4. Create active consent between doctor and patient
    await AccessRequest.create({
      patientId,
      doctorId,
      purpose: 'Clinical evaluation and prescription management',
      scope: 'FULL',
      status: 'APPROVED',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      schemaVersion: 1,
    });

    // 5. Upload record for patient
    await request(app)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${patientToken}`)
      .attach('file', validPdfBuffer, { filename: 'cbc_report.pdf', contentType: 'application/pdf' })
      .field('title', 'Complete Blood Count')
      .field('type', 'LAB_REPORT');
  }, 300000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('Feature 11: Generates offline emergency package and validates integrity hash', async () => {
    const genRes = await request(app)
      .post('/api/v1/offline/package')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(genRes.status).toBe(200);
    expect(genRes.body.status).toBe('SUCCESS');
    expect(genRes.body.integrityHash).toBeDefined();
    expect(genRes.body.encryptedPackage).toBeDefined();

    const serialized = JSON.stringify(genRes.body.data);

    // Verify package integrity
    const verifyRes = await request(app)
      .post('/api/v1/offline/verify')
      .send({
        integrityHash: genRes.body.integrityHash,
        serializedData: serialized,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe('VERIFIED');
    expect(verifyRes.body.verified).toBe(true);

    // Verify tampered payload fails
    const tamperedRes = await request(app)
      .post('/api/v1/offline/verify')
      .send({
        integrityHash: genRes.body.integrityHash,
        serializedData: serialized + 'tampered',
      });

    expect(tamperedRes.status).toBe(200);
    expect(tamperedRes.body.status).toBe('TAMPERED');
    expect(tamperedRes.body.verified).toBe(false);
  });

  it('Feature 12: Doctor creates encrypted clinical note and views decrypted history', async () => {
    const noteRes = await request(app)
      .post('/api/v1/clinical-notes')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId,
        content: 'Patient exhibits normal blood pressure and stable recovery markers.',
        tags: ['follow-up', 'vitals'],
      });

    expect(noteRes.status).toBe(201);
    expect(noteRes.body.status).toBe('SUCCESS');
    expect(noteRes.body.noteId).toBeDefined();

    // Doctor reads notes
    const listRes = await request(app)
      .get(`/api/v1/clinical-notes/patient/${patientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.notes.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.notes[0].content).toContain('normal blood pressure');
  });

  it('Feature 13: Activity feed aggregates security and consent actions', async () => {
    const feedRes = await request(app)
      .get('/api/v1/activity/feed')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(feedRes.status).toBe(200);
    expect(feedRes.body.status).toBe('SUCCESS');
    expect(Array.isArray(feedRes.body.activities)).toBe(true);
    expect(feedRes.body.activities.length).toBeGreaterThan(0);
  });

  it('Feature 14: FHIR R4 Bundle export and observation import', async () => {
    const exportRes = await request(app)
      .get('/api/v1/fhir/export')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.resourceType).toBe('Bundle');
    expect(exportRes.body.type).toBe('collection');
    expect(exportRes.body.entry.length).toBeGreaterThanOrEqual(1);
    expect(exportRes.body.entry[0].resource.resourceType).toBe('Patient');

    // Import observation into patient record
    const importRes = await request(app)
      .post('/api/v1/fhir/import')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Observation',
              code: { text: 'Heart Rate' },
              valueQuantity: { value: 72, unit: 'bpm' },
              effectiveDateTime: new Date().toISOString(),
            },
          },
        ],
      });

    expect(importRes.status).toBe(200);
    expect(importRes.body.status).toBe('SUCCESS');
    expect(importRes.body.importedObservations).toBe(1);
  });

  it('Feature 15: Caregiver proxy access grant, listing, and revocation', async () => {
    const grantRes = await request(app)
      .post('/api/v1/proxy/grant')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        caregiverEmail,
        scopes: ['RECORDS_VIEW', 'EMERGENCY_VIEW'],
        durationDays: 14,
      });

    expect(grantRes.status).toBe(201);
    expect(grantRes.body.status).toBe('SUCCESS');
    const proxyAccessId = grantRes.body.access.id;

    const listRes = await request(app)
      .get('/api/v1/proxy/caregivers')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.myCaregivers.length).toBeGreaterThanOrEqual(1);

    // Revoke
    const revokeRes = await request(app)
      .post(`/api/v1/proxy/${proxyAccessId}/revoke`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.message).toContain('revoked');
  });

  it('Feature 16: Cryptographic proof commitments and verification', async () => {
    const claim = 'Patient COVID-19 mRNA vaccination series completed';
    const blindingFactor = '0123456789abcdef0123456789abcdef';

    const commitRes = await request(app)
      .post('/api/v1/proofs/commit')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ claim, blindingFactor });

    expect(commitRes.status).toBe(201);
    const commitment = commitRes.body.commitment;
    expect(commitment).toHaveLength(64);

    // Verify valid proof
    const verifyRes = await request(app)
      .post('/api/v1/proofs/verify')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ claim, blindingFactor, commitment, patientId });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verified).toBe(true);
    expect(verifyRes.body.status).toBe('VERIFIED');

    // Verify wrong blinding factor fails
    const invalidRes = await request(app)
      .post('/api/v1/proofs/verify')
      .send({ claim, blindingFactor: 'wrong_secret_blinding_factor', commitment, patientId });

    expect(invalidRes.status).toBe(200);
    expect(invalidRes.body.verified).toBe(false);
    expect(invalidRes.body.status).toBe('INVALID_COMMITMENT');
  });

  it('Feature 17 & 18: Prescriptions and automated drug interaction checker', async () => {
    // 1. Doctor creates prescription with interactive medications
    const rxRes = await request(app)
      .post('/api/v1/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId,
        medications: [
          { name: 'Warfarin', dosage: '5mg', frequency: 'Once daily', duration: '30 days' },
          { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', duration: '30 days' },
        ],
        notes: 'Take with food.',
      });

    expect(rxRes.status).toBe(201);
    expect(rxRes.body.prescription).toBeDefined();
    createdPrescriptionId = rxRes.body.prescription._id;
    // Feature 18: Flags interaction between Warfarin and Aspirin
    expect(rxRes.body.interactionWarnings.length).toBeGreaterThan(0);
    expect(rxRes.body.interactionWarnings[0].severity).toBe('HIGH');
    expect(rxRes.body.disclaimer).toBeDefined();

    // 2. Patient lists their prescriptions
    const listRxRes = await request(app)
      .get('/api/v1/prescriptions')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRxRes.status).toBe(200);
    expect(listRxRes.body.prescriptions.length).toBeGreaterThanOrEqual(1);

    // 3. Refill request
    const refillRes = await request(app)
      .post(`/api/v1/prescriptions/${createdPrescriptionId}/refill`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(refillRes.status).toBe(200);
    expect(refillRes.body.status).toBe('SUCCESS');

    // 4. Standalone Drug Interaction Checker API
    const checkerRes = await request(app)
      .post('/api/v1/prescriptions/check-interactions')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        medications: ['Sildenafil', 'Nitroglycerin'],
      });

    expect(checkerRes.status).toBe(200);
    expect(checkerRes.body.hasInteractions).toBe(true);
    expect(checkerRes.body.interactions[0].severity).toBe('HIGH');
    expect(checkerRes.body.interactions[0].title).toContain('PDE5 Inhibitor + Organic Nitrate');
  });

  it('Feature 19: Health goals creation and progress tracking', async () => {
    // 1. Create target goal
    const goalRes = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        metricType: 'HEART_RATE',
        targetValue: 65,
        initialValue: 85,
        unit: 'bpm',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Lower resting heart rate via cardio workouts.',
      });

    expect(goalRes.status).toBe(201);
    expect(goalRes.body.goal).toBeDefined();
    createdGoalId = goalRes.body.goal._id;

    // 2. Fetch goals progress
    const progressRes = await request(app)
      .get('/api/v1/goals/progress')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(progressRes.status).toBe(200);
    expect(progressRes.body.progress.length).toBeGreaterThanOrEqual(1);
    expect(progressRes.body.progress[0].metricType).toBe('HEART_RATE');

    // 3. Update goal
    const updateRes = await request(app)
      .patch(`/api/v1/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ status: 'ACHIEVED' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.goal.status).toBe('ACHIEVED');
  });

  it('Feature 20: Telehealth appointment scheduling, E2EE room access, and cancellation', async () => {
    const slotStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    // 1. Schedule appointment
    const scheduleRes = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId,
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString(),
        reason: 'Quarterly medication review consultation',
      });

    expect(scheduleRes.status).toBe(201);
    expect(scheduleRes.body.appointment).toBeDefined();
    createdAppointmentId = scheduleRes.body.appointment._id;

    // 2. List appointments
    const listRes = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.appointments.length).toBeGreaterThanOrEqual(1);

    // 3. Get E2EE Telehealth Room session
    const roomRes = await request(app)
      .get(`/api/v1/appointments/${createdAppointmentId}/telehealth`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(roomRes.status).toBe(200);
    expect(roomRes.body.roomId).toContain('medichain-telehealth-');
    expect(roomRes.body.sessionToken).toBeDefined();
    expect(roomRes.body.encryption).toBe('E2EE-WebRTC-AES-GCM');

    // 4. Cancel appointment
    const cancelRes = await request(app)
      .post(`/api/v1/appointments/${createdAppointmentId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('SUCCESS');
  });
});
