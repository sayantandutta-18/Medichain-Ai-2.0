import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const auditRouter = Router();

// Retrieve scoped audit history for the caller only (no IDOR)
auditRouter.get('/audit/me', requireAuth, AuditController.getMyAuditLogs);

// Cryptographic hash-chain integrity verification (Admin only)
auditRouter.get('/audit/verify', requireAuth, AuditController.verifyAuditChain);
