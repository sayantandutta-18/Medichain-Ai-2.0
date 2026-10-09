import { Router } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const prescriptionRouter = Router();

prescriptionRouter.post('/prescriptions', requireAuth, PrescriptionController.create);
prescriptionRouter.get('/prescriptions', requireAuth, PrescriptionController.list);
prescriptionRouter.post('/prescriptions/check-interactions', requireAuth, PrescriptionController.checkInteractions);
prescriptionRouter.post('/prescriptions/:id/refill', requireAuth, PrescriptionController.requestRefill);
