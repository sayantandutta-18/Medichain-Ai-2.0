import { createHmac, randomBytes, randomUUID } from 'crypto';
import { WebhookSubscription, WebhookSubscriptionDocument } from '../models/WebhookSubscription.js';
import { AuditService } from './audit.service.js';
import { AppError } from '../middleware/errorHandler.js';

export interface WebhookDeliveryResult {
  subscriptionId: string;
  url: string;
  signature: string;
  payload: {
    id: string;
    event: string;
    data: any;
    timestamp: string;
  };
  headers: Record<string, string>;
}

export class WebhookService {
  /**
   * Generates a cryptographically strong webhook secret key.
   */
  public static generateSecret(): string {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }

  /**
   * Computes HMAC-SHA256 signature for the given payload string and secret.
   */
  public static computeSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Registers a new webhook subscription for a user.
   */
  public static async registerSubscription(params: {
    userId: string;
    url: string;
    secret?: string;
    events?: string[];
  }): Promise<WebhookSubscriptionDocument> {
    const secret = params.secret && params.secret.trim() ? params.secret : this.generateSecret();
    const events = params.events && params.events.length > 0
      ? params.events
      : ['RECORD_CREATED', 'CONSENT_APPROVED', 'PRESCRIPTION_ISSUED'];

    const subscription = await WebhookSubscription.create({
      userId: params.userId,
      url: params.url,
      secret,
      events,
      active: true,
      schemaVersion: 1,
    });

    return subscription;
  }

  /**
   * Lists all active or registered webhook subscriptions for a user.
   */
  public static async listSubscriptions(userId: string): Promise<WebhookSubscriptionDocument[]> {
    return WebhookSubscription.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Removes a webhook subscription owned by the user.
   */
  public static async removeSubscription(subscriptionId: string, userId: string): Promise<boolean> {
    const result = await WebhookSubscription.findOneAndDelete({ _id: subscriptionId, userId });
    return !!result;
  }

  /**
   * Simulates/dispatches a test ping event to verify signature verification.
   */
  public static async testDelivery(
    subscriptionId: string,
    userId: string
  ): Promise<WebhookDeliveryResult> {
    const sub = await WebhookSubscription.findOne({ _id: subscriptionId, userId });
    if (!sub) {
      throw new AppError('Webhook subscription not found', 404);
    }

    const payload = {
      id: randomUUID(),
      event: 'TEST_PING',
      data: {
        message: 'MediChain webhook test event',
        subscriptionId: sub._id.toString(),
        endpoint: sub.url,
      },
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.computeSignature(payloadString, sub.secret);

    sub.lastDeliveredAt = new Date();
    await sub.save();

    await AuditService.record({
      actorId: userId,
      role: 'PATIENT',
      action: 'WEBHOOK_DELIVERED',
      targetId: sub._id.toString(),
      requestId: 'webhook-test',
      metadata: { url: sub.url, event: 'TEST_PING' },
    });

    return {
      subscriptionId: sub._id.toString(),
      url: sub.url,
      signature: `sha256=${signature}`,
      payload,
      headers: {
        'Content-Type': 'application/json',
        'X-MediChain-Signature': `sha256=${signature}`,
        'X-MediChain-Event': 'TEST_PING',
        'X-MediChain-Delivery': payload.id,
      },
    };
  }

  /**
   * Dispatches events to all matching active subscriber endpoints for a user.
   */
  public static async dispatch(
    userId: string,
    event: string,
    data: any
  ): Promise<WebhookDeliveryResult[]> {
    const subs = await WebhookSubscription.find({
      userId,
      active: true,
      events: { $in: [event, '*'] },
    });

    const deliveries: WebhookDeliveryResult[] = [];
    const now = new Date();

    for (const sub of subs) {
      const payload = {
        id: randomUUID(),
        event,
        data,
        timestamp: now.toISOString(),
      };
      const payloadString = JSON.stringify(payload);
      const signature = this.computeSignature(payloadString, sub.secret);

      sub.lastDeliveredAt = now;
      await sub.save();

      deliveries.push({
        subscriptionId: sub._id.toString(),
        url: sub.url,
        signature: `sha256=${signature}`,
        payload,
        headers: {
          'Content-Type': 'application/json',
          'X-MediChain-Signature': `sha256=${signature}`,
          'X-MediChain-Event': event,
          'X-MediChain-Delivery': payload.id,
        },
      });
    }

    return deliveries;
  }
}
