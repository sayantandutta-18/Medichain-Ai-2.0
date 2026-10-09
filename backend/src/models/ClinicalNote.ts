import { Schema, model, Document, Types } from 'mongoose';

export interface IClinicalNote {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  recordId?: Types.ObjectId;
  encryptedPayload: {
    ciphertext: string;
    iv: string;
    authTag: string;
    keyVersion: number;
  };
  tags?: string[];
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClinicalNoteDocument extends IClinicalNote, Document<Types.ObjectId> {}

const clinicalNoteSchema = new Schema<ClinicalNoteDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recordId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicalRecord',
      index: true,
    },
    encryptedPayload: {
      ciphertext: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
      keyVersion: { type: Number, default: 1 },
    },
    tags: {
      type: [String],
      default: [],
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

clinicalNoteSchema.index({ patientId: 1, doctorId: 1, createdAt: -1 });

export const ClinicalNote = model<ClinicalNoteDocument>('ClinicalNote', clinicalNoteSchema);
