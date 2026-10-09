import { Schema, model, Document, Types } from 'mongoose';

export interface IUserSession {
  userId: Types.ObjectId;
  sessionId: string;
  refreshTokenHash: string;
  userAgent?: string;
  deviceType: string;
  ip?: string;
  lastActive: Date;
  revoked: boolean;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserSessionDocument extends IUserSession, Document<Types.ObjectId> {}

const userSessionSchema = new Schema<UserSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: 'Unknown Browser',
    },
    deviceType: {
      type: String,
      enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
      default: 'Desktop',
    },
    ip: {
      type: String,
      default: '127.0.0.1',
    },
    lastActive: {
      type: Date,
      default: Date.now,
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

userSessionSchema.index({ userId: 1, revoked: 1 });

export const UserSession = model<UserSessionDocument>('UserSession', userSessionSchema);
