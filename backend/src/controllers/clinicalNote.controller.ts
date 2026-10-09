import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ClinicalNote } from '../models/ClinicalNote.js';
import { can } from '../policy/policy.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const createNoteSchema = z.object({
  patientId: z.string().min(1),
  recordId: z.string().optional(),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string().max(50)).optional(),
});

export class ClinicalNoteController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = createNoteSchema.parse(req.body);

      // Verify doctor has active consent or patient self-notes
      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:read',
        { recordPatientId: validated.patientId }
      );

      if (!allowed) {
        throw new AppError('Access Denied: No approved consent to add clinical notes for this patient', 403);
      }

      // Generate temporary dummy note ID for AAD binding
      const noteObjectId = new Types.ObjectId();
      const aad = `${noteObjectId.toString()}|${validated.patientId}`;
      const encrypted = encrypt(Buffer.from(validated.content, 'utf-8'), aad);

      const note = await ClinicalNote.create({
        _id: noteObjectId,
        patientId: validated.patientId,
        doctorId: req.user.userId,
        recordId: validated.recordId ? new Types.ObjectId(validated.recordId) : undefined,
        encryptedPayload: {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyVersion: 1,
        },
        tags: validated.tags || [],
        schemaVersion: 1,
      });

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'CLINICAL_NOTE_CREATED',
        targetId: note._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { patientId: validated.patientId },
      });

      res.status(201).json({
        status: 'SUCCESS',
        noteId: note._id,
        createdAt: note.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listForPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:read',
        { recordPatientId: patientId }
      );

      if (!allowed) {
        throw new AppError('Access Denied: No active consent to inspect clinical notes', 403);
      }

      const notes = await ClinicalNote.find({ patientId })
        .populate('doctorId', 'firstName lastName email')
        .sort({ createdAt: -1 });

      const decryptedNotes = notes.map((note) => {
        const aad = `${note._id.toString()}|${patientId}`;
        let content = '[Decryption error]';
        try {
          content = decrypt(note.encryptedPayload, aad).toString('utf-8');
        } catch {
          // Ignore decryption error
        }

        return {
          id: note._id,
          doctorId: note.doctorId,
          recordId: note.recordId,
          content,
          tags: note.tags,
          createdAt: note.createdAt,
        };
      });

      res.status(200).json({
        status: 'SUCCESS',
        notes: decryptedNotes,
      });
    } catch (err) {
      next(err);
    }
  }
}
