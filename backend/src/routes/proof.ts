import { Router } from 'express';
import { ProofController } from '../controllers/proof.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const proofRouter = Router();

proofRouter.post('/proofs/commit', requireAuth, ProofController.createCommitment);
proofRouter.post('/proofs/verify', ProofController.verifyCommitment);
