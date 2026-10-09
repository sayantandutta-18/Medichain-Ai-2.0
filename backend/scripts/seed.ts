import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { encrypt } from '../src/utils/crypto.js';
import { sha256 } from '../src/utils/hash.js';
import { User } from '../src/models/User.js';
import { MedicalRecord } from '../src/models/MedicalRecord.js';
import { AccessRequest } from '../src/models/AccessRequest.js';
import { ClinicalNote } from '../src/models/ClinicalNote.js';
import { Prescription } from '../src/models/Prescription.js';
import { HealthMetric } from '../src/models/HealthMetric.js';
import { EmergencyProfile } from '../src/models/EmergencyProfile.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { AuditService } from '../src/services/audit.service.js';

export async function seed(): Promise<void> {
  console.log('=====================================================');
  console.log('   MediChain-AI: Comprehensive Portfolio Demo Seed   ');
  console.log('=====================================================');

  const mongoUri = env.MONGODB_URI || 'mongodb://localhost:27017/medichain';
  await connectDB(mongoUri);

  try {
    // 1. Password hashing with bcryptjs (cost 12)
    const defaultPassword = 'TestPassword123!';
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    console.log('[1/8] Seeding core users...');

    // Admin
    let admin = await User.findOne({ email: 'admin.system@example.dev' });
    if (!admin) {
      admin = await User.create({
        email: 'admin.system@example.dev',
        passwordHash,
        role: 'ADMIN',
        firstName: 'System',
        lastName: 'Admin',
        schemaVersion: 1,
      });
      console.log('  -> Admin created: admin.system@example.dev');
    }

    // Doctor Clara (Verified Physician)
    let doctorClara = await User.findOne({ email: 'doctor.clara@example.dev' });
    if (!doctorClara) {
      doctorClara = await User.create({
        email: 'doctor.clara@example.dev',
        passwordHash,
        role: 'DOCTOR',
        firstName: 'Clara',
        lastName: 'Oswald',
        licenseNumber: 'MD-994821',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: admin._id,
        schemaVersion: 1,
      });
      console.log('  -> Verified Doctor created: doctor.clara@example.dev');
    }

    // Doctor Gregory (Verified Physician)
    let doctorGregory = await User.findOne({ email: 'doctor.house@example.dev' });
    if (!doctorGregory) {
      doctorGregory = await User.create({
        email: 'doctor.house@example.dev',
        passwordHash,
        role: 'DOCTOR',
        firstName: 'Gregory',
        lastName: 'House',
        licenseNumber: 'MD-881920',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: admin._id,
        schemaVersion: 1,
      });
      console.log('  -> Verified Doctor created: doctor.house@example.dev');
    }

    // Patient Alice
    let patientAlice = await User.findOne({ email: 'patient.alice@example.dev' });
    if (!patientAlice) {
      patientAlice = await User.create({
        email: 'patient.alice@example.dev',
        passwordHash,
        role: 'PATIENT',
        firstName: 'Alice',
        lastName: 'Smith',
        schemaVersion: 1,
      });
      console.log('  -> Patient created: patient.alice@example.dev');
    }

    // Patient Bob
    let patientBob = await User.findOne({ email: 'patient.bob@example.dev' });
    if (!patientBob) {
      patientBob = await User.create({
        email: 'patient.bob@example.dev',
        passwordHash,
        role: 'PATIENT',
        firstName: 'Bob',
        lastName: 'Jones',
        schemaVersion: 1,
      });
      console.log('  -> Patient created: patient.bob@example.dev');
    }

    // 2. Encrypted Medical Records (Rules 7 & 8)
    console.log('[2/8] Seeding AES-256-GCM encrypted medical records...');

    const sampleFiles = [
      {
        title: 'Annual Comprehensive Metabolic Panel',
        type: 'LAB_REPORT',
        patient: patientAlice,
        content: '%PDF-1.4 Comprehensive Metabolic Panel Report. Glucose: 95 mg/dL, BUN: 14 mg/dL, Creatinine: 0.9 mg/dL. All normal.',
        filename: 'metabolic_panel_2026.pdf',
        anchorStatus: 'CONFIRMED' as const,
        txDigest: '0x9b78294a8bc31f90aefd72983719461947bca821037192849182371928471928',
        objectId: '0x4f1284a719284719284719284719284719284719284719284719284719284719',
      },
      {
        title: 'Resting 12-Lead Electrocardiogram',
        type: 'CARDIOLOGY',
        patient: patientAlice,
        content: '%PDF-1.4 ECG Report. Heart rate: 72 bpm, PR interval: 160 ms, QRS duration: 90 ms, QT/QTc: 380/410 ms. Normal Sinus Rhythm.',
        filename: 'ecg_cardiology_scan.pdf',
        anchorStatus: 'CONFIRMED' as const,
        txDigest: '0x5c89172849102837461928374619283746192837461928374619283746192837',
        objectId: '0x2a94810293847561029384756102938475610293847561029384756102938475',
      },
      {
        title: 'Chest Radiograph - Posteroanterior',
        type: 'IMAGING',
        patient: patientAlice,
        content: '%PDF-1.4 Chest X-Ray PA View. Lungs clear, cardiothoracic ratio normal, no acute cardiopulmonary abnormalities.',
        filename: 'chest_xray_pa.pdf',
        anchorStatus: 'PENDING' as const,
        txDigest: undefined,
        objectId: undefined,
      },
      {
        title: 'Immunization & Vaccination Record',
        type: 'IMMUNIZATION',
        patient: patientBob,
        content: '%PDF-1.4 Bob Jones Immunization History. Tdap, MMR, Hepatitis B series verified up-to-date.',
        filename: 'immunization_history.pdf',
        anchorStatus: 'CONFIRMED' as const,
        txDigest: '0x7d6a5b4c3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b',
        objectId: '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
      },
    ];

    const createdRecords: any[] = [];
    for (const item of sampleFiles) {
      let rec = await MedicalRecord.findOne({ title: item.title, patientId: item.patient._id });
      if (!rec) {
        const fileBuffer = Buffer.from(item.content, 'utf-8');
        const fileSha256 = sha256(fileBuffer);
        const recordId = new Types.ObjectId();
        const aad = `${recordId.toString()}|${item.patient._id.toString()}`;
        const encrypted = encrypt(fileBuffer, aad);

        rec = await MedicalRecord.create({
          _id: recordId,
          patientId: item.patient._id,
          title: item.title,
          type: item.type,
          status: 'ACTIVE',
          encryptedPayload: encrypted,
          sha256: fileSha256,
          keyVersion: 1,
          originalFilename: item.filename,
          mimeType: 'application/pdf',
          sizeBytes: fileBuffer.length,
          blockchainAnchor: {
            status: item.anchorStatus,
            mode: 'simulated',
            txDigest: item.txDigest,
            objectId: item.objectId,
            anchoredAt: item.anchorStatus === 'CONFIRMED' ? new Date() : undefined,
          },
          schemaVersion: 1,
        });
        console.log(`  -> Record created: "${item.title}" (Encrypted AES-256-GCM)`);
      }
      createdRecords.push(rec);
    }

    // 3. Clinical Consent & Verifiable Receipts (Features 01 & 02)
    console.log('[3/8] Seeding access consent requests & cryptographic receipts...');
    let accessConsent = await AccessRequest.findOne({
      patientId: patientAlice._id,
      doctorId: doctorClara._id,
    });

    if (!accessConsent) {
      const requestId = new Types.ObjectId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      const receiptPayload = {
        receiptId: `receipt-${randomUUID()}`,
        requestId: requestId.toString(),
        patientId: patientAlice._id.toString(),
        doctorId: doctorClara._id.toString(),
        status: 'APPROVED',
        scope: 'FULL',
        purpose: 'Comprehensive cardiology review & longitudinal care plan',
        grantedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        issuer: 'MediChain-AI Verifiable Consent Engine',
      };
      const receiptProof = sha256(JSON.stringify(receiptPayload));

      accessConsent = await AccessRequest.create({
        _id: requestId,
        patientId: patientAlice._id,
        doctorId: doctorClara._id,
        status: 'APPROVED',
        scope: 'FULL',
        purpose: 'Comprehensive cardiology review & longitudinal care plan',
        expiresAt,
        decidedAt: new Date(),
        receipt: {
          ...receiptPayload,
          cryptographicProof: receiptProof,
        },
        schemaVersion: 1,
      });
      console.log('  -> Approved consent granted for Dr. Clara with cryptographic receipt');
    }

    // 4. Encrypted Clinical Notes (Feature 12)
    console.log('[4/8] Seeding encrypted clinical progress notes...');
    let clinicalNote = await ClinicalNote.findOne({
      patientId: patientAlice._id,
      doctorId: doctorClara._id,
    });

    if (!clinicalNote) {
      const noteId = new Types.ObjectId();
      const noteContent = 'Patient reports excellent tolerance to current lifestyle interventions. Resting ECG confirms stable sinus rhythm. Recommended continued aerobic activity and standard lipid re-evaluation in 6 months.';
      const noteAad = `${noteId.toString()}|${patientAlice._id.toString()}`;
      const encryptedNote = encrypt(Buffer.from(noteContent, 'utf-8'), noteAad);

      clinicalNote = await ClinicalNote.create({
        _id: noteId,
        patientId: patientAlice._id,
        doctorId: doctorClara._id,
        recordId: createdRecords[0]?._id,
        encryptedPayload: {
          ciphertext: encryptedNote.ciphertext,
          iv: encryptedNote.iv,
          authTag: encryptedNote.authTag,
          keyVersion: 1,
        },
        tags: ['Cardiology', 'Sinus Rhythm', 'Consultation'],
        schemaVersion: 1,
      });
      console.log('  -> Encrypted clinical note authored by Dr. Clara');
    }

    // 5. Prescriptions with Drug Interaction Safety Screening (Features 17 & 18)
    console.log('[5/8] Seeding clinical prescriptions with drug interaction screening...');
    let prescription = await Prescription.findOne({
      patientId: patientAlice._id,
      doctorId: doctorClara._id,
    });

    if (!prescription) {
      prescription = await Prescription.create({
        patientId: patientAlice._id,
        doctorId: doctorClara._id,
        recordId: createdRecords[0]?._id,
        medications: [
          {
            name: 'Atorvastatin',
            dosage: '20mg',
            frequency: 'Once daily at bedtime',
            duration: '90 days',
            instructions: 'Take with or without food. Avoid grapefruit.',
          },
          {
            name: 'Coenzyme Q10',
            dosage: '100mg',
            frequency: 'Once daily with morning meal',
            duration: '90 days',
            instructions: 'Cardioprotective adjunct supplementation.',
          },
        ],
        notes: 'Routine lipid management protocol.',
        schemaVersion: 1,
      });
      console.log('  -> Prescription issued: Atorvastatin 20mg + CoQ10 100mg');
    }

    // 6. Longitudinal Health Vitals & Metrics (Features 13 & 14)
    console.log('[6/8] Seeding longitudinal vitals & health metrics...');
    const existingMetric = await HealthMetric.findOne({ patientId: patientAlice._id });
    if (!existingMetric) {
      const metricsData = [
        { metricType: 'BLOOD_PRESSURE' as const, value: 120, secondaryValue: 80, unit: 'mmHg', notes: 'Resting seated blood pressure' },
        { metricType: 'BLOOD_PRESSURE' as const, value: 118, secondaryValue: 78, unit: 'mmHg', notes: 'Morning baseline' },
        { metricType: 'HEART_RATE' as const, value: 72, unit: 'bpm', notes: 'Resting pulse' },
        { metricType: 'HEART_RATE' as const, value: 68, unit: 'bpm', notes: 'Post-walk pulse' },
        { metricType: 'GLUCOSE' as const, value: 95, unit: 'mg/dL', notes: 'Fasting capillary blood glucose' },
        { metricType: 'WEIGHT' as const, value: 68.5, unit: 'kg', notes: 'Standard morning weigh-in' },
      ];

      for (const m of metricsData) {
        await HealthMetric.create({
          patientId: patientAlice._id,
          ...m,
          recordedAt: new Date(),
          schemaVersion: 1,
        });
      }
      console.log(`  -> Created ${metricsData.length} longitudinal health metric observations`);
    }

    // 7. Emergency Medical Profile & Contacts (Feature 21)
    console.log('[7/8] Seeding first-responder emergency medical profile...');
    let emergencyProfile = await EmergencyProfile.findOne({ patientId: patientAlice._id });
    if (!emergencyProfile) {
      emergencyProfile = await EmergencyProfile.create({
        patientId: patientAlice._id,
        bloodGroup: 'O+',
        allergies: ['Penicillin', 'Sulfa Antibiotics'],
        emergencyContacts: [
          {
            name: 'Jonathan Smith',
            relation: 'Spouse',
            phone: '+1-555-0199',
          },
        ],
        conditionsSummary: 'Mild seasonal asthma, hyperlipidemia managed with statin therapy.',
        schemaVersion: 1,
      });
      console.log('  -> Emergency profile created: Blood Group O+, Allergy Penicillin');
    }

    // 8. Cryptographically Chained Audit Trail (Rule 9)
    console.log('[8/8] Building cryptographically chained audit trail...');
    const auditCount = await AuditLog.countDocuments();
    if (auditCount < 5) {
      const demoAuditEvents = [
        {
          actorId: admin._id,
          role: 'ADMIN',
          action: 'REGISTER',
          targetId: admin._id.toString(),
          requestId: `req-seed-${randomUUID()}`,
          metadata: { systemInitialization: true },
        },
        {
          actorId: doctorClara._id,
          role: 'DOCTOR',
          action: 'REGISTER',
          targetId: doctorClara._id.toString(),
          requestId: `req-seed-${randomUUID()}`,
          metadata: { specialty: 'Cardiology' },
        },
        {
          actorId: admin._id,
          role: 'ADMIN',
          action: 'VERIFICATION',
          targetId: doctorClara._id.toString(),
          requestId: `req-seed-${randomUUID()}`,
          metadata: { license: 'MD-994821', verified: true },
        },
        {
          actorId: patientAlice._id,
          role: 'PATIENT',
          action: 'REGISTER',
          targetId: patientAlice._id.toString(),
          requestId: `req-seed-${randomUUID()}`,
          metadata: { onboarding: 'complete' },
        },
        {
          actorId: patientAlice._id,
          role: 'PATIENT',
          action: 'RECORD_CREATE',
          targetId: createdRecords[0]?._id.toString(),
          requestId: `req-seed-${randomUUID()}`,
          metadata: { recordType: 'LAB_REPORT', encryption: 'AES-256-GCM' },
        },
        {
          actorId: patientAlice._id,
          role: 'PATIENT',
          action: 'ACCESS_APPROVED',
          targetId: accessConsent._id.toString(),
          requestId: `req-seed-${randomUUID()}`,
          metadata: { doctorId: doctorClara._id.toString(), scope: 'FULL' },
        },
        {
          actorId: doctorClara._id,
          role: 'DOCTOR',
          action: 'RECORD_VIEWED',
          targetId: createdRecords[0]?._id.toString(),
          requestId: `req-seed-${randomUUID()}`,
          metadata: { verifiedConsent: true },
        },
      ];

      for (const event of demoAuditEvents) {
        await AuditService.record(event);
      }
      console.log(`  -> Recorded ${demoAuditEvents.length} chained audit events`);
    }

    // Cryptographic audit chain verification
    const verification = await AuditService.verifyChain();
    if (verification.valid) {
      console.log(`[VERIFIED] Audit log hash-chain is 100% cryptographically intact (${verification.totalEntries} entries verified)`);
    } else {
      console.warn(`[WARNING] Audit log hash-chain verification flagged an issue:`, verification);
    }

    console.log('\n=====================================================');
    console.log('   Demo Seed Completed Successfully!                 ');
    console.log('   Default Demo Credentials:                         ');
    console.log('   --------------------------------------------------');
    console.log('   * Patient:  patient.alice@example.dev / TestPassword123!');
    console.log('   * Doctor:   doctor.clara@example.dev  / TestPassword123!');
    console.log('   * Admin:    admin.system@example.dev  / TestPassword123!');
    console.log('=====================================================\n');
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
