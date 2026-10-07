import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { AuditService } from '../services/audit.service.js';
import { can } from '../policy/policy.js';
import { AppError } from '../middleware/errorHandler.js';

export class AuditController {
  public static async getMyAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const userId = req.user.userId;

      // Policy check (audit:read-own)
      const allowed = await can(
        { userId, role: req.user.role },
        'audit:read-own',
        { targetActorId: userId }
      );

      if (!allowed) {
        throw new AppError('Access denied: Cannot view another user’s audit logs', 403);
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const skip = (page - 1) * limit;

      // Query scoped strictly to the authenticated caller (IDOR defense)
      const [logs, total] = await Promise.all([
        AuditLog.find({ actorId: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments({ actorId: userId }),
      ]);

      res.status(200).json({
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyAuditChain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      if (req.user.role !== 'ADMIN') {
        throw new AppError('Admin privileges required to verify system audit chain', 403);
      }

      const result = await AuditService.verifyChain();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
