import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog {
  actorId: Types.ObjectId;
  role: string;
  action: string;
  targetId?: string;
  requestId: string;
  ip?: string;
  prevHash: string;
  hash: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  schemaVersion: number;
}

export interface AuditLogDocument extends IAuditLog, Document<Types.ObjectId> {}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
    },
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    ip: {
      type: String,
    },
    prevHash: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: false, // Audit logs are immutable with fixed createdAt
  }
);

// Compound index supporting actor-scoped audit history queries
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = model<AuditLogDocument>('AuditLog', auditLogSchema);
