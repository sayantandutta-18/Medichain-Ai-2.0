import { Router } from 'express';
import { GoalController } from '../controllers/goal.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const goalRouter = Router();

goalRouter.post('/goals', requireAuth, GoalController.create);
goalRouter.get('/goals', requireAuth, GoalController.list);
goalRouter.get('/goals/progress', requireAuth, GoalController.getProgress);
goalRouter.patch('/goals/:id', requireAuth, GoalController.update);
goalRouter.delete('/goals/:id', requireAuth, GoalController.delete);
