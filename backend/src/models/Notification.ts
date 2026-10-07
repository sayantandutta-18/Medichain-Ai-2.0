import { Schema, model, Document, Types } from 'mongoose';

export interface INotification {
  userId: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationDocument extends INotification, Document<Types.ObjectId> {}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      default: 'INFO',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    expiresAt: {
      type: Date,
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

// TTL index to automatically purge old notifications if expiresAt is set
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = model<NotificationDocument>('Notification', notificationSchema);
