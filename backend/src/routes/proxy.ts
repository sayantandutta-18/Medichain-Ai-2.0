import { Router } from 'express';
import { ProxyController } from '../controllers/proxy.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const proxyRouter = Router();

proxyRouter.post('/proxy/grant', requireAuth, ProxyController.grant);
proxyRouter.get('/proxy/caregivers', requireAuth, ProxyController.listCaregivers);
proxyRouter.post('/proxy/:id/revoke', requireAuth, ProxyController.revoke);
