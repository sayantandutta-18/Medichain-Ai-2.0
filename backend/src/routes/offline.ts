import { Router } from 'express';
import { OfflineController } from '../controllers/offline.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const offlineRouter = Router();

offlineRouter.post('/offline/package', requireAuth, OfflineController.generatePackage);
offlineRouter.post('/offline/verify', OfflineController.verifyPackage);
