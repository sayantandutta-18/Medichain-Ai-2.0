import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ShareLink } from '../models/ShareLink.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { EmergencyProfile } from '../models/EmergencyProfile.js';
import { User } from '../models/User.js';
import { AuditService } from '../services/audit.service.js';
import { sha256 } from '../utils/hash.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const createShareLinkSchema = z
  .object({
    scope: z.enum(['EMERGENCY_CARD', 'RECORD']).optional(),
    recordId: z.string().optional(),
    expiresInHours: z.number().optional(),
    expiresInMinutes: z.number().optional(),
    singleUse: z.boolean().default(false),
  })
  .transform((data) => {
    const scope = data.scope || (data.recordId ? 'RECORD' : 'EMERGENCY_CARD');
    const durationMs = data.expiresInMinutes
      ? data.expiresInMinutes * 60 * 1000
      : (data.expiresInHours || 24) * 60 * 60 * 1000;
    return {
      ...data,
      scope,
      durationMs,
    };
  });

export class ShareController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = createShareLinkSchema.parse(req.body);

      if (validated.scope === 'RECORD' && !validated.recordId) {
        throw new AppError('recordId is required when scope is RECORD', 400);
      }

      // Generate opaque 32-byte cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256(rawToken);

      const expiresAt = new Date(Date.now() + validated.durationMs);

      const shareLink = await ShareLink.create({
        tokenHash,
        patientId: req.user.userId,
        scope: validated.scope,
        recordId: validated.recordId,
        expiresAt,
        singleUse: validated.singleUse,
        used: false,
        revoked: false,
        schemaVersion: 1,
      });

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'SHARE_LINK_CREATED',
        targetId: shareLink._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { scope: validated.scope, singleUse: validated.singleUse },
      });

      res.status(201).json({
        message: 'Share link created successfully',
        token: rawToken, // Returned only once; raw token is never stored in DB
        shareId: shareLink._id,
        expiresAt,
        scope: validated.scope,
        singleUse: validated.singleUse,
        shareLink: {
          id: shareLink._id,
          token: rawToken,
          expiresAt,
          singleUse: validated.singleUse,
          scope: validated.scope,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const links = await ShareLink.find({ patientId: req.user.userId })
        .populate('recordId', 'title type createdAt')
        .sort({ createdAt: -1 });

      res.status(200).json({ links });
    } catch (err) {
      next(err);
    }
  }

  public static async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const link = await ShareLink.findOneAndUpdate(
        { _id: req.params.id, patientId: req.user.userId },
        { revoked: true },
        { new: true }
      );

      if (!link) {
        throw new AppError('Share link not found', 404);
      }

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'SHARE_LINK_REVOKED',
        targetId: link._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      res.status(200).json({ message: 'Share link revoked successfully', link });
    } catch (err) {
      next(err);
    }
  }

  // Public viewer endpoint using the raw token
  public static async viewByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      if (!rawToken) throw new AppError('Missing share token', 400);

      const tokenHash = sha256(rawToken);

      const shareLink = await ShareLink.findOne({ tokenHash });
      if (!shareLink || shareLink.revoked) {
        throw new AppError('Access Denied: Share token is invalid or has been revoked', 403);
      }

      if (new Date() > shareLink.expiresAt) {
        throw new AppError('Access Denied: Share token has expired', 403);
      }

      if (shareLink.singleUse && shareLink.used) {
        throw new AppError('Access Denied: Single-use share token has already been consumed', 403);
      }

      // Mark single-use token as used immediately
      if (shareLink.singleUse) {
        shareLink.used = true;
        await shareLink.save();
      }

      await AuditService.record({
        actorId: shareLink.patientId as any,
        role: 'PUBLIC_TOKEN',
        action: 'SHARE_LINK_ACCESSED',
        targetId: shareLink._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { scope: shareLink.scope },
      });

      if (shareLink.scope === 'RECORD' && shareLink.recordId) {
        const record = await MedicalRecord.findById(shareLink.recordId).select(
          '-encryptedPayload.ciphertext'
        );
        if (!record || record.deletedAt) {
          throw new AppError('Record not found or has been deleted', 404);
        }
        res.status(200).json({ scope: 'RECORD', record, verificationStatus: 'VERIFIED' });
        return;
      }

      // EMERGENCY_CARD scope: Strictly allow-listed fields only
      const [patient, profile] = await Promise.all([
        User.findById(shareLink.patientId).select('firstName lastName'),
        EmergencyProfile.findOne({ patientId: shareLink.patientId }),
      ]);

      res.status(200).json({
        scope: 'EMERGENCY_CARD',
        emergencyCard: {
          patientName: patient?.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : 'Patient',
          bloodGroup: profile?.bloodGroup || 'Not Specified',
          allergies: profile?.allergies || [],
          emergencyContacts: profile?.emergencyContacts || [],
          conditionsSummary: profile?.conditionsSummary || 'None specified',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
