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

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Central error middleware (safe messages, requestId, strictly no stack traces)
  app.use(centralErrorHandler);

  return app;
}

export const app = createApp();
