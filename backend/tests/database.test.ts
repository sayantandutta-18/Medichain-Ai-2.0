import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { sanitizeDbError } from '../src/config/db.js';
import {
  User,
  MedicalRecord,
  AccessRequest,
  AuditLog,
  ShareLink,
  Notification,
  Appointment,
  Prescription,
  EmergencyProfile,
  CaregiverAccess,
  Organization,
  Membership,
  SecurityEvent,
} from '../src/models/index.js';

describe('Database Models, Schema Compilation, and Indexes', () => {
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

  it('compiles all models successfully and creates instances', async () => {
    const models = [
      User,
      MedicalRecord,
      AccessRequest,
      AuditLog,
      ShareLink,
      Notification,
      Appointment,
      Prescription,
      EmergencyProfile,
      CaregiverAccess,
      Organization,
      Membership,
      SecurityEvent,
    ];

    for (const model of models) {
      expect(model).toBeDefined();
      expect(typeof model.find).toBe('function');
      expect(model.schema.path('schemaVersion')).toBeDefined();
    }
  });

  it('defines required indexes on core models', async () => {
    // MedicalRecord indexes
    const recordIndexes = MedicalRecord.schema.indexes();
    const hasRecordPatientCreatedIndex = recordIndexes.some(([fields]) => {
      return (fields as any).patientId === 1 && (fields as any).createdAt === -1;
    });
    expect(hasRecordPatientCreatedIndex).toBe(true);

    // AccessRequest indexes: patientId, doctorId, status
    const accessIndexes = AccessRequest.schema.indexes();
    const hasAccessRequestCompound = accessIndexes.some(([fields]) => {
      return (fields as any).patientId === 1 && (fields as any).doctorId === 1 && (fields as any).status === 1;
    });
    expect(hasAccessRequestCompound).toBe(true);

    // AuditLog indexes: actorId, createdAt
    const auditIndexes = AuditLog.schema.indexes();
    const hasAuditCompound = auditIndexes.some(([fields]) => {
      return (fields as any).actorId === 1 && (fields as any).createdAt === -1;
    });
    expect(hasAuditCompound).toBe(true);

    // ShareLink indexes: tokenHash index and TTL on expiresAt
    const shareIndexes = ShareLink.schema.indexes();
    const hasShareTokenIndex = ShareLink.schema.path('tokenHash').options.unique === true;
    const hasShareTTL = shareIndexes.some(([fields, options]) => {
      return (fields as any).expiresAt === 1 && options?.expireAfterSeconds === 0;
    });
    expect(hasShareTokenIndex).toBe(true);
    expect(hasShareTTL).toBe(true);

    // Notification TTL index
    const notifIndexes = Notification.schema.indexes();
    const hasNotifTTL = notifIndexes.some(([fields, options]) => {
      return (fields as any).expiresAt === 1 && options?.expireAfterSeconds === 0;
    });
    expect(hasNotifTTL).toBe(true);

    // Appointment double booking prevention unique index
    const apptIndexes = Appointment.schema.indexes();
    const hasApptUniqueIndex = apptIndexes.some(([fields, options]) => {
      return (fields as any).doctorId === 1 && (fields as any).slotStart === 1 && options?.unique === true;
    });
    expect(hasApptUniqueIndex).toBe(true);
  });

  it('creates collections and builds indexes in MongoDB memory server without error', async () => {
    await Promise.all([
      User.init(),
      MedicalRecord.init(),
      AccessRequest.init(),
      AuditLog.init(),
      ShareLink.init(),
      Notification.init(),
      Appointment.init(),
    ]);

    const recordCollections = await MedicalRecord.listIndexes();
    expect(recordCollections.length).toBeGreaterThan(1);
  }, 30000);

  it('sanitizes DB errors to never leak credentials or connection strings', () => {
    const leakError = new Error(
      'connect ECONNREFUSED mongodb+srv://db_user:SuperSecretPassword123@cluster0.abc.mongodb.net/medichain?retryWrites=true'
    );
    const sanitized = sanitizeDbError(leakError);

    expect(sanitized).not.toContain('SuperSecretPassword123');
    expect(sanitized).not.toContain('db_user');
    expect(sanitized).toContain('mongodb://[REDACTED]');
  });
});
