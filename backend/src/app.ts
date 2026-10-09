import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { notFoundHandler, centralErrorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { accessRouter } from './routes/access.js';
import { recordRouter } from './routes/record.js';
import { auditRouter } from './routes/audit.js';
import { aiRouter } from './routes/ai.js';
import { notificationRouter } from './routes/notification.js';
import { emergencyRouter } from './routes/emergency.js';
import { shareRouter } from './routes/share.js';
import { analyticsRouter } from './routes/analytics.js';
import { adminRouter } from './routes/admin.js';
import { blockchainRouter } from './routes/blockchain.js';
import { offlineRouter } from './routes/offline.js';
import { clinicalNoteRouter } from './routes/clinicalNote.js';
import { activityRouter } from './routes/activity.js';
import { fhirRouter } from './routes/fhir.js';
import { proxyRouter } from './routes/proxy.js';
import { proofRouter } from './routes/proof.js';
import { prescriptionRouter } from './routes/prescription.js';
import { goalRouter } from './routes/goal.js';
import { appointmentRouter } from './routes/appointment.js';

export function createApp(): Express {
  const app = express();

  // Security headers via Helmet
  app.use(helmet());

  // CORS configuration driven by CORS_ORIGIN
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Request ID middleware (assigns UUID to req and X-Request-Id response header)
  app.use(requestIdMiddleware);

  // HTTP request logging (skip during tests)
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // JSON body parser with configurable payload limit
  app.use(express.json({ limit: `${env.MAX_UPLOAD_MB}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${env.MAX_UPLOAD_MB}mb` }));

  // Routes
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', authRouter);
  app.use('/api/v1', accessRouter);
  app.use('/api/v1', recordRouter);
  app.use('/api/v1', auditRouter);
  app.use('/api/v1', aiRouter);
  app.use('/api/v1', notificationRouter);
  app.use('/api/v1', emergencyRouter);
  app.use('/api/v1', shareRouter);
  app.use('/api/v1', analyticsRouter);
  app.use('/api/v1', adminRouter);
  app.use('/api/v1', blockchainRouter);
  app.use('/api/v1', offlineRouter);
  app.use('/api/v1', clinicalNoteRouter);
  app.use('/api/v1', activityRouter);
  app.use('/api/v1', fhirRouter);
  app.use('/api/v1', proxyRouter);
  app.use('/api/v1', proofRouter);
  app.use('/api/v1', prescriptionRouter);
  app.use('/api/v1', goalRouter);
  app.use('/api/v1', appointmentRouter);

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Central error middleware (safe messages, requestId, strictly no stack traces)
  app.use(centralErrorHandler);

  return app;
}

export const app = createApp();
