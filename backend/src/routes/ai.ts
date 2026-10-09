import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const aiRouter = Router();

// Server-side authorized AI record explanation
aiRouter.post('/ai/records/:id/explain', requireAuth, AiController.explainRecord);
aiRouter.post('/ai/records/compare', requireAuth, AiController.compareRecords);
aiRouter.post('/ai/timeline', requireAuth, AiController.explainTimeline);
