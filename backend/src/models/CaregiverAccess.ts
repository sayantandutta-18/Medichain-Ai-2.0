import { Schema, model, Document, Types } from 'mongoose';

export interface ICaregiverAccess {
  patientId: Types.ObjectId;
  caregiverId: Types.ObjectId;
  scopes: string[];
  expiresAt: Date;
  revoked: boolean;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CaregiverAccessDocument extends ICaregiverAccess, Document<Types.ObjectId> {}

const caregiverAccessSchema = new Schema<CaregiverAccessDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    caregiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scopes: {
      type: [String],
      required: true,
      default: ['RECORDS_VIEW'],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
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

caregiverAccessSchema.index({ patientId: 1, caregiverId: 1 });

export const CaregiverAccess = model<CaregiverAccessDocument>(
  'CaregiverAccess',
  caregiverAccessSchema
);
