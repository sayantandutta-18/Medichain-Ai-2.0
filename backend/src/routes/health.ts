import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { SuiClient } from '../blockchain/suiClient.js';

export const healthRouter = Router();

// Basic health endpoint
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'medichain-api',
  });
});

// Liveness probe (container orchestrator check)
healthRouter.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'live',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (subsystems verification)
healthRouter.get('/health/ready', async (_req: Request, res: Response) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const encryptionConfigured = Boolean(env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length >= 32);
  const jwtConfigured = Boolean(env.JWT_SECRET && env.JWT_SECRET.length >= 16);
  const suiMode = SuiClient.getMode();
  const aiConfigured = Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 5);

  const ready = dbConnected && encryptionConfigured && jwtConfigured;

  const subsystems = {
    database: {
      status: dbConnected ? 'UP' : 'DOWN',
      readyState: mongoose.connection.readyState,
    },
    cryptography: {
      status: encryptionConfigured ? 'UP' : 'DOWN',
      cipher: 'AES-256-GCM',
    },
    jwtAuth: {
      status: jwtConfigured ? 'UP' : 'DOWN',
    },
    blockchainAnchor: {
      status: suiMode === 'disabled' ? 'DOWN' : 'UP',
      mode: suiMode,
      network: env.SUI_NETWORK,
      packageId: env.SUI_PACKAGE_ID,
    },
    aiAssistant: {
      status: aiConfigured ? 'UP' : 'DISABLED',
      model: env.OPENAI_MODEL,
    },
  };

  const statusCode = ready ? 200 : 503;

  res.status(statusCode).json({
    status: ready ? 'ready' : 'not_ready',
    ready,
    timestamp: new Date().toISOString(),
    subsystems,
  });
});
