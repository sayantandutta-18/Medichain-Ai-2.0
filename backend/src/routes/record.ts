import { Router } from 'express';
import multer from 'multer';
import { RecordController } from '../controllers/record.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { env } from '../config/env.js';

export const recordRouter = Router();

// Configure Multer for in-memory processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
  },
});

recordRouter.post('/records', requireAuth, upload.single('file'), RecordController.upload);
recordRouter.get('/records', requireAuth, RecordController.list);
recordRouter.get('/records/:id', requireAuth, RecordController.getById);
recordRouter.get('/records/:id/download', requireAuth, RecordController.download);
recordRouter.patch('/records/:id', requireAuth, RecordController.updateMetadata);
recordRouter.delete('/records/:id', requireAuth, RecordController.deleteRecord);
