import { Router } from 'express';
import { ShareController } from '../controllers/share.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const shareRouter = Router();

shareRouter.post('/share-links', requireAuth, ShareController.create);
shareRouter.post('/shares', requireAuth, ShareController.create);

shareRouter.get('/share-links', requireAuth, ShareController.list);
shareRouter.get('/shares', requireAuth, ShareController.list);

shareRouter.post('/share-links/:id/revoke', requireAuth, ShareController.revoke);
shareRouter.delete('/shares/:id', requireAuth, ShareController.revoke);

// Public token verification endpoint (unauthenticated, token itself is the authorization credential)
shareRouter.get('/share/view/:token', ShareController.viewByToken);
shareRouter.get('/shares/view/:token', ShareController.viewByToken);
