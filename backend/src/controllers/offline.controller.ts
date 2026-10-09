import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { EmergencyProfile } from '../models/EmergencyProfile.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { sha256 } from '../utils/hash.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';

export class OfflineController {
  public static async generatePackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const [user, profile] = await Promise.all([
        User.findById(req.user.userId),
        EmergencyProfile.findOne({ patientId: req.user.userId }),
      ]);

      if (!user) throw new AppError('User not found', 404);

      // Minimal emergency allow-listed data only (Master Rule 5 & 7)
      const allowListed = {
        patientId: user._id.toString(),
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Emergency Patient',
        bloodGroup: profile?.bloodGroup || 'Not Specified',
        allergies: profile?.allergies || [],
        emergencyContacts: profile?.emergencyContacts || [],
        conditionsSummary: profile?.conditionsSummary || 'None specified',
        generatedAt: new Date().toISOString(),
      };

      const serialized = JSON.stringify(allowListed);
      const integrityHash = sha256(serialized);

      // Encrypt for offline device storage
      const aad = `OFFLINE|${user._id.toString()}`;
      const encrypted = encrypt(Buffer.from(serialized, 'utf-8'), aad);

      const offlineToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day offline cache grant

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'OFFLINE_PACKAGE_GENERATED',
        targetId: user._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { integrityHash },
      });

      res.status(200).json({
        status: 'SUCCESS',
        offlineToken,
        encryptedPackage: encrypted,
        integrityHash,
        expiresAt,
        data: allowListed,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { integrityHash, serializedData } = req.body;
      if (!integrityHash || !serializedData) {
        throw new AppError('integrityHash and serializedData are required', 400);
      }

      const computed = sha256(serializedData);
      const isValid = computed === integrityHash;

      res.status(200).json({
        status: isValid ? 'VERIFIED' : 'TAMPERED',
        verified: isValid,
        computedHash: computed,
        providedHash: integrityHash,
      });
    } catch (err) {
      next(err);
    }
  }
}
