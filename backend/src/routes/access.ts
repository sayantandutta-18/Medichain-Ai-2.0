import { Router } from 'express';
import { AccessController } from '../controllers/access.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const accessRouter = Router();

accessRouter.post('/access-requests', requireAuth, AccessController.createRequest);
accessRouter.get('/access-requests', requireAuth, AccessController.listRequests);
accessRouter.post('/access-requests/:id/approve', requireAuth, AccessController.approveRequest);
accessRouter.post('/access-requests/:id/reject', requireAuth, AccessController.rejectRequest);
accessRouter.post('/access-requests/:id/revoke', requireAuth, AccessController.revokeRequest);
accessRouter.get('/access-requests/:id/receipt', requireAuth, AccessController.downloadReceipt);
