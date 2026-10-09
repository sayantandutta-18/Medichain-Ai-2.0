import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const analyticsRouter = Router();

analyticsRouter.post('/analytics/metrics', requireAuth, AnalyticsController.logMetric);
analyticsRouter.get('/analytics/metrics', requireAuth, AnalyticsController.getMetrics);
analyticsRouter.get('/analytics/summary', requireAuth, AnalyticsController.getMetrics);
