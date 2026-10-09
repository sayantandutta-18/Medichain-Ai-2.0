import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { AccessRequest } from '../models/AccessRequest.js';
import { AppError } from '../middleware/errorHandler.js';

export class ActivityController {
  public static async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const userId = req.user.userId;

      // 1. Fetch recent audit events involving the user as actor or target
      const auditEvents = await AuditLog.find({
        $or: [{ actorId: userId }, { targetId: userId }],
      })
        .sort({ createdAt: -1 })
        .limit(30);

      // 2. Fetch access requests where user is patient or doctor
      const accessEvents = await AccessRequest.find({
        $or: [{ patientId: userId }, { doctorId: userId }],
      })
        .populate('doctorId', 'firstName lastName email')
        .populate('patientId', 'firstName lastName email')
        .sort({ updatedAt: -1 })
        .limit(20);

      const feed: any[] = [];

      for (const a of auditEvents) {
        feed.push({
          id: `audit-${a._id}`,
          type: 'SECURITY_AUDIT',
          action: a.action,
          role: a.role,
          timestamp: a.createdAt,
          details: `Security event logged: ${a.action.replace(/_/g, ' ')}`,
          hash: a.hash,
        });
      }

      for (const reqEvent of accessEvents) {
        feed.push({
          id: `access-${reqEvent._id}`,
          type: 'CONSENT_REQUEST',
          action: `CONSENT_${reqEvent.status}`,
          timestamp: reqEvent.updatedAt || reqEvent.createdAt,
          details: `Consent request status: ${reqEvent.status} (Purpose: ${reqEvent.purpose})`,
          scope: reqEvent.scope,
        });
      }

      // Sort combined feed descending
      feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.status(200).json({
        status: 'SUCCESS',
        activities: feed.slice(0, 40),
      });
    } catch (err) {
      next(err);
    }
  }
}
