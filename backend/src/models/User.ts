import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface IUser {
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  lastLoginAt?: Date;
  licenseNumber?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  refreshTokenHash?: string | null;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserDocument extends IUser, Document<Types.ObjectId> {}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'ADMIN'],
      required: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    lastLoginAt: {
      type: Date,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    refreshTokenHash: {
      type: String,
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

export const User = model<UserDocument>('User', userSchema);
