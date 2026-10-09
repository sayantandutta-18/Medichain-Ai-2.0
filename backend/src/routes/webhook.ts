import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const webhookRouter = Router();

webhookRouter.post('/webhooks', requireAuth, WebhookController.createSubscription);
webhookRouter.get('/webhooks', requireAuth, WebhookController.listSubscriptions);
webhookRouter.delete('/webhooks/:id', requireAuth, WebhookController.deleteSubscription);
webhookRouter.post('/webhooks/:id/test', requireAuth, WebhookController.testSubscription);
