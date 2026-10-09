import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sha256 } from '../utils/hash.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const createCommitmentSchema = z.object({
  claim: z.string().min(3).max(500),
  blindingFactor: z.string().min(8).max(256),
  recordId: z.string().optional(),
});

const verifyCommitmentSchema = z.object({
  claim: z.string().min(1),
  blindingFactor: z.string().min(1),
  commitment: z.string().length(64),
  patientId: z.string().optional(),
});

export class ProofController {
  public static async createCommitment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = createCommitmentSchema.parse(req.body);

      // Commitment formula: SHA-256(claim | blindingFactor | patientId)
      const secretPreimage = `${validated.claim}|${validated.blindingFactor}|${req.user.userId}`;
      const commitment = sha256(secretPreimage);

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_READ',
        targetId: req.user.userId,
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: {
          proofType: 'CRYPTOGRAPHIC_COMMITMENT',
          commitmentHash: commitment,
          recordId: validated.recordId,
        },
      });

      res.status(201).json({
        status: 'SUCCESS',
        commitment,
        claim: validated.claim,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyCommitment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = verifyCommitmentSchema.parse(req.body);

      const targetPatientId = validated.patientId || req.user?.userId;
      if (!targetPatientId) {
        throw new AppError('patientId is required for public verification', 400);
      }

      const expectedPreimage = `${validated.claim}|${validated.blindingFactor}|${targetPatientId}`;
      const expectedCommitment = sha256(expectedPreimage);

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedCommitment, 'hex'),
        Buffer.from(validated.commitment, 'hex')
      );

      res.status(200).json({
        status: isValid ? 'VERIFIED' : 'INVALID_COMMITMENT',
        verified: isValid,
        claim: validated.claim,
      });
    } catch (err) {
      next(err);
    }
  }
}
