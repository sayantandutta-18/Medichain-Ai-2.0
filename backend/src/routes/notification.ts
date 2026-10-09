import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const notificationRouter = Router();

notificationRouter.get('/notifications', requireAuth, NotificationController.list);
notificationRouter.patch('/notifications/:id/read', requireAuth, NotificationController.markRead);
notificationRouter.post('/notifications/:id/read', requireAuth, NotificationController.markRead);
notificationRouter.post('/notifications/read-all', requireAuth, NotificationController.markAllRead);
