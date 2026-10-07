import { Schema, model, Document, Types } from 'mongoose';

export interface IEncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export interface IMedicalRecord {
  patientId: Types.ObjectId;
  title: string;
  type: string;
  status: string;
  encryptedPayload: IEncryptedPayload;
  sha256: string;
  keyVersion: number;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  deletedAt?: Date | null;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MedicalRecordDocument extends IMedicalRecord, Document<Types.ObjectId> {}

const encryptedPayloadSchema = new Schema<IEncryptedPayload>(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    keyVersion: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const medicalRecordSchema = new Schema<MedicalRecordDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      default: 'LAB_REPORT',
    },
    status: {
      type: String,
      required: true,
      default: 'PENDING_ANCHOR',
    },
    encryptedPayload: {
      type: encryptedPayloadSchema,
      required: true,
    },
    sha256: {
      type: String,
      required: true,
      index: true,
    },
    keyVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    originalFilename: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    sizeBytes: {
      type: Number,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index supporting patient record queries ordered by creation time
medicalRecordSchema.index({ patientId: 1, createdAt: -1 });

export const MedicalRecord = model<MedicalRecordDocument>('MedicalRecord', medicalRecordSchema);
