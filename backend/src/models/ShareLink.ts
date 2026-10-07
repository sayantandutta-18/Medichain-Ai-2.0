import { Schema, model, Document, Types } from 'mongoose';

export type ShareScope = 'EMERGENCY_CARD' | 'RECORD';

export interface IShareLink {
  tokenHash: string;
  patientId: Types.ObjectId;
  scope: ShareScope;
  recordId?: Types.ObjectId;
  expiresAt: Date;
  revoked: boolean;
  singleUse: boolean;
  used: boolean;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShareLinkDocument extends IShareLink, Document<Types.ObjectId> {}

const shareLinkSchema = new Schema<ShareLinkDocument>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ['EMERGENCY_CARD', 'RECORD'],
      required: true,
    },
    recordId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicalRecord',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    singleUse: {
      type: Boolean,
      default: false,
    },
    used: {
      type: Boolean,
      default: false,
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

// TTL index to automatically purge expired share links
shareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ShareLink = model<ShareLinkDocument>('ShareLink', shareLinkSchema);
