import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const appointmentRouter = Router();

appointmentRouter.get('/appointments/doctors', requireAuth, AppointmentController.getAvailableDoctors);
appointmentRouter.post('/appointments', requireAuth, AppointmentController.schedule);
appointmentRouter.get('/appointments', requireAuth, AppointmentController.list);
appointmentRouter.post('/appointments/:id/cancel', requireAuth, AppointmentController.cancel);
appointmentRouter.get('/appointments/:id/telehealth', requireAuth, AppointmentController.getTelehealthRoom);
