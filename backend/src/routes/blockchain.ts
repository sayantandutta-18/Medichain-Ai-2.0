import { Router } from 'express';
import { BlockchainController } from '../controllers/blockchain.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const blockchainRouter = Router();

blockchainRouter.get('/blockchain/explorer', requireAuth, BlockchainController.getExplorer);
