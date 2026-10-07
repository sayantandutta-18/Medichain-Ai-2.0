import { Schema, model, Document, Types } from 'mongoose';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ISecurityEvent {
  actorId?: Types.ObjectId;
  eventType: string;
  severity: SecuritySeverity;
  ruleName: string;
  details?: Record<string, any>;
  ip?: string;
  requestId?: string;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SecurityEventDocument extends ISecurityEvent, Document<Types.ObjectId> {}

const securityEventSchema = new Schema<SecurityEventDocument>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      required: true,
    },
    ruleName: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ip: {
      type: String,
    },
    requestId: {
      type: String,
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

securityEventSchema.index({ eventType: 1, createdAt: -1 });

export const SecurityEvent = model<SecurityEventDocument>('SecurityEvent', securityEventSchema);
