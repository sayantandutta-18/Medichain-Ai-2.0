import { Router } from 'express';
import { FhirController } from '../controllers/fhir.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const fhirRouter = Router();

fhirRouter.get('/fhir/export', requireAuth, FhirController.exportPatientBundle);
fhirRouter.post('/fhir/import', requireAuth, FhirController.importBundle);
