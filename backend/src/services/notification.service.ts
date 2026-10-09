import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';

export interface CreateNotificationParams {
  userId?: string | Types.ObjectId;
  recipientId?: string | Types.ObjectId;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  expiresInDays?: number;
}

export class NotificationService {
  public static async notify(params: CreateNotificationParams): Promise<void> {
    try {
      const targetUserId = params.userId || params.recipientId;
      if (!targetUserId) {
        throw new Error('Notification requires userId or recipientId');
      }

      const expiresAt = params.expiresInDays
        ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day TTL

      await Notification.create({
        userId: targetUserId,
        type: params.type,
        title: params.title,
        message: params.message,
        read: false,
        metadata: params.metadata,
        expiresAt,
        schemaVersion: 1,
      });
    } catch (err) {
      console.error('Failed to create notification event:', err);
    }
  }
}
