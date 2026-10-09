import { Router } from 'express';
import { ExportController } from '../controllers/export.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const exportRouter = Router();

exportRouter.get('/export/health-summary', requireAuth, ExportController.exportHealthSummary);
