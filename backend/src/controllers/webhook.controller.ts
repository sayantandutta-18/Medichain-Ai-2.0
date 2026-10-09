import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WebhookService } from '../services/webhook.service.js';
import { AppError } from '../middleware/errorHandler.js';

const createWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL format'),
  secret: z.string().min(8).max(128).optional(),
  events: z.array(z.string().min(1)).optional(),
});

export class WebhookController {
  public static async createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = createWebhookSchema.parse(req.body);

      const subscription = await WebhookService.registerSubscription({
        userId: req.user.userId,
        url: validated.url,
        secret: validated.secret,
        events: validated.events,
      });

      res.status(201).json({
        message: 'Webhook subscription created successfully',
        subscription: {
          id: subscription._id.toString(),
          url: subscription.url,
          secret: subscription.secret, // returned once upon creation
          events: subscription.events,
          active: subscription.active,
          createdAt: subscription.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const subscriptions = await WebhookService.listSubscriptions(req.user.userId);

      const sanitized = subscriptions.map((sub) => ({
        id: sub._id.toString(),
        url: sub.url,
        maskedSecret: `${sub.secret.slice(0, 8)}...${sub.secret.slice(-4)}`,
        events: sub.events,
        active: sub.active,
        lastDeliveredAt: sub.lastDeliveredAt,
        createdAt: sub.createdAt,
      }));

      res.status(200).json({
        subscriptions: sanitized,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const deleted = await WebhookService.removeSubscription(
        req.params.id as string,
        req.user.userId
      );

      if (!deleted) {
        throw new AppError('Webhook subscription not found', 404);
      }

      res.status(200).json({
        message: 'Webhook subscription deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  public static async testSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const result = await WebhookService.testDelivery(
        req.params.id as string,
        req.user.userId
      );

      res.status(200).json({
        message: 'Test webhook event generated with cryptographic HMAC-SHA256 signature',
        delivery: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
