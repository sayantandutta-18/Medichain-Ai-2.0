import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const sessionRouter = Router();

sessionRouter.get('/auth/sessions', requireAuth, SessionController.listSessions);
sessionRouter.post('/auth/sessions/:sessionId/revoke', requireAuth, SessionController.revokeSession);
sessionRouter.post('/auth/sessions/revoke-all', requireAuth, SessionController.revokeAllOtherSessions);
