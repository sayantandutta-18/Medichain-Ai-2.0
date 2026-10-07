import { Schema, model, Document, Types } from 'mongoose';

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
export type AccessScope = 'VIEW' | 'DOWNLOAD' | 'FULL';

export interface IAccessRequest {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  status: AccessRequestStatus;
  scope: AccessScope;
  purpose: string;
  expiresAt: Date;
  decidedAt?: Date;
  receipt?: Record<string, any>;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AccessRequestDocument extends IAccessRequest, Document<Types.ObjectId> {}

const accessRequestSchema = new Schema<AccessRequestDocument>(
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
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED'],
      default: 'PENDING',
      required: true,
    },
    scope: {
      type: String,
      enum: ['VIEW', 'DOWNLOAD', 'FULL'],
      default: 'VIEW',
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    decidedAt: {
      type: Date,
    },
    receipt: {
      type: Schema.Types.Mixed,
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

// Compound index supporting access lookup by patient, doctor, and status
accessRequestSchema.index({ patientId: 1, doctorId: 1, status: 1 });

export const AccessRequest = model<AccessRequestDocument>('AccessRequest', accessRequestSchema);
