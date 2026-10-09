import { Router } from 'express';
import { ClinicalNoteController } from '../controllers/clinicalNote.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const clinicalNoteRouter = Router();

clinicalNoteRouter.post('/clinical-notes', requireAuth, ClinicalNoteController.create);
clinicalNoteRouter.get('/clinical-notes/patient/:patientId', requireAuth, ClinicalNoteController.listForPatient);
