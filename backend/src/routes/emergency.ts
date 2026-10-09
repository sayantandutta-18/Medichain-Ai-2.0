import { Router } from 'express';
import { EmergencyController } from '../controllers/emergency.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const emergencyRouter = Router();

emergencyRouter.get('/emergency/profile', requireAuth, EmergencyController.getProfile);
emergencyRouter.put('/emergency/profile', requireAuth, EmergencyController.updateProfile);
emergencyRouter.get('/emergency/card', requireAuth, EmergencyController.getProfile);
emergencyRouter.post('/emergency/card', requireAuth, EmergencyController.updateProfile);

// Unauthenticated public route for emergency first-responders (strictly minimal allow-listed fields)
emergencyRouter.get('/emergency/view/:patientId', EmergencyController.getPublicEmergencyCard);
emergencyRouter.get('/emergency/public/:token', EmergencyController.getPublicEmergencyCard);
