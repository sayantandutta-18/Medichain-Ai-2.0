import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { CaregiverAccess } from '../models/CaregiverAccess.js';
import { User } from '../models/User.js';
import { NotificationService } from '../services/notification.service.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const grantProxySchema = z
  .object({
    caregiverEmail: z.string().email().optional(),
    caregiverId: z.string().optional(),
    scopes: z.array(z.string()).default(['RECORDS_VIEW']),
    durationDays: z.number().int().min(1).max(365).default(30),
  })
  .refine((data) => data.caregiverEmail || data.caregiverId, {
    message: 'Either caregiverEmail or caregiverId must be provided',
  });

export class ProxyController {
  public static async grant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      if (req.user.role !== 'PATIENT') {
        throw new AppError('Only patients can designate caregiver proxies', 403);
      }

      const validated = grantProxySchema.parse(req.body);

      let caregiverUser = null;
      if (validated.caregiverId) {
        caregiverUser = await User.findById(validated.caregiverId);
      } else if (validated.caregiverEmail) {
        caregiverUser = await User.findOne({ email: validated.caregiverEmail.toLowerCase().trim() });
      }

      if (!caregiverUser) {
        throw new AppError('Designated caregiver user account not found', 404);
      }

      if (caregiverUser._id.toString() === req.user.userId) {
        throw new AppError('Cannot grant caregiver proxy access to yourself', 400);
      }

      const expiresAt = new Date(Date.now() + validated.durationDays * 24 * 60 * 60 * 1000);

      const access = await CaregiverAccess.findOneAndUpdate(
        {
          patientId: req.user.userId,
          caregiverId: caregiverUser._id,
        },
        {
          scopes: validated.scopes,
          expiresAt,
          revoked: false,
          schemaVersion: 1,
        },
        { upsert: true, new: true }
      );

      await NotificationService.notify({
        userId: caregiverUser._id.toString(),
        type: 'CAREGIVER_ACCESS_GRANTED',
        title: 'Caregiver Access Granted',
        message: 'A patient has designated you as an authorized caregiver proxy.',
        metadata: { patientId: req.user.userId, scopes: validated.scopes },
      });

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'ACCESS_REQUEST_DECIDED',
        targetId: caregiverUser._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { proxyAccessId: access._id.toString(), scopes: validated.scopes },
      });

      res.status(201).json({
        status: 'SUCCESS',
        access: {
          id: access._id,
          caregiver: {
            id: caregiverUser._id,
            email: caregiverUser.email,
            name: `${caregiverUser.firstName} ${caregiverUser.lastName}`.trim(),
          },
          scopes: access.scopes,
          expiresAt: access.expiresAt,
          revoked: access.revoked,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listCaregivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const userId = req.user.userId;

      // 1. Caregivers who have access to this patient's records
      const myCaregivers = await CaregiverAccess.find({ patientId: userId })
        .populate('caregiverId', 'firstName lastName email')
        .sort({ createdAt: -1 });

      // 2. Patients who granted current user access as a caregiver
      const proxyFor = await CaregiverAccess.find({
        caregiverId: userId,
        revoked: false,
        expiresAt: { $gt: new Date() },
      })
        .populate('patientId', 'firstName lastName email')
        .sort({ createdAt: -1 });

      res.status(200).json({
        status: 'SUCCESS',
        myCaregivers,
        proxyFor,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const access = await CaregiverAccess.findOne({
        _id: id,
        patientId: req.user.userId,
      });

      if (!access) {
        throw new AppError('Caregiver access record not found or unauthorized', 404);
      }

      access.revoked = true;
      await access.save();

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'ACCESS_REVOKED',
        targetId: access.caregiverId.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { proxyAccessId: access._id.toString() },
      });

      res.status(200).json({
        status: 'SUCCESS',
        message: 'Caregiver access revoked successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
