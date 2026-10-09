import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from '../services/audit.service.js';

export class AdminController {
  public static async getPendingDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError('Forbidden: Admin access required', 403);
      }

      const doctors = await User.find({
        role: 'DOCTOR',
        verificationStatus: 'PENDING',
      }).select('-passwordHash -refreshTokens');

      res.status(200).json({
        status: 'SUCCESS',
        doctors,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async approveDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError('Forbidden: Admin access required', 403);
      }

      const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const doctor = await User.findOne({ _id: doctorId, role: 'DOCTOR' });

      if (!doctor) {
        throw new AppError('Doctor not found', 404);
      }

      doctor.verificationStatus = 'VERIFIED';
      doctor.verifiedAt = new Date();
      doctor.verifiedBy = req.user.userId as any;
      await doctor.save();

      await AuditService.record({
        actorId: req.user.userId,
        role: 'ADMIN',
        action: 'DOCTOR_VERIFIED',
        targetId: doctorId,
        requestId: req.requestId || 'unknown',
        metadata: { licenseNumber: doctor.licenseNumber },
      });

      res.status(200).json({
        status: 'SUCCESS',
        message: 'Doctor verified successfully',
        doctor: {
          id: doctor._id,
          name: [doctor.firstName, doctor.lastName].filter(Boolean).join(' ') || 'Doctor',
          email: doctor.email,
          licenseNumber: doctor.licenseNumber,
          verificationStatus: doctor.verificationStatus,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async rejectDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError('Forbidden: Admin access required', 403);
      }

      const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const doctor = await User.findOne({ _id: doctorId, role: 'DOCTOR' });

      if (!doctor) {
        throw new AppError('Doctor not found', 404);
      }

      doctor.verificationStatus = 'REJECTED';
      doctor.verifiedAt = new Date();
      doctor.verifiedBy = req.user.userId as any;
      await doctor.save();

      await AuditService.record({
        actorId: req.user.userId,
        role: 'ADMIN',
        action: 'DOCTOR_REJECTED',
        targetId: doctorId,
        requestId: req.requestId || 'unknown',
        metadata: { licenseNumber: doctor.licenseNumber },
      });

      res.status(200).json({
        status: 'SUCCESS',
        message: 'Doctor rejected',
        doctor: {
          id: doctor._id,
          name: [doctor.firstName, doctor.lastName].filter(Boolean).join(' ') || 'Doctor',
          email: doctor.email,
          verificationStatus: doctor.verificationStatus,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
