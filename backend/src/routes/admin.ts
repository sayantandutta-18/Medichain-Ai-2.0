import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const adminRouter = Router();

adminRouter.get('/admin/doctors/pending', requireAuth, AdminController.getPendingDoctors);
adminRouter.post('/admin/doctors/:id/approve', requireAuth, AdminController.approveDoctor);
adminRouter.post('/admin/doctors/:id/reject', requireAuth, AdminController.rejectDoctor);
