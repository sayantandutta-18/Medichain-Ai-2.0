import { Schema, model, Document, Types } from 'mongoose';

export type MembershipRole = 'ADMIN' | 'MEMBER' | 'DOCTOR' | 'STAFF';

export interface IMembership {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MembershipRole;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MembershipDocument extends IMembership, Document<Types.ObjectId> {}

const membershipSchema = new Schema<MembershipDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'MEMBER', 'DOCTOR', 'STAFF'],
      default: 'MEMBER',
      required: true,
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

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const Membership = model<MembershipDocument>('Membership', membershipSchema);
