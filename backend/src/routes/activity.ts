import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const activityRouter = Router();

activityRouter.get('/activity/feed', requireAuth, ActivityController.getFeed);
activityRouter.get('/activity', requireAuth, ActivityController.getFeed);
