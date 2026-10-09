import { Request, Response, NextFunction } from 'express';
import { UserSession } from '../models/UserSession.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from '../services/audit.service.js';

export class SessionController {
  public static async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const sessions = await UserSession.find({ userId: req.user.userId })
        .sort({ lastActive: -1 })
        .limit(20);

      res.status(200).json({
        sessions: sessions.map((s) => ({
          sessionId: s.sessionId,
          deviceType: s.deviceType,
          userAgent: s.userAgent,
          ip: s.ip,
          lastActive: s.lastActive,
          revoked: s.revoked,
          createdAt: s.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const sessionId = req.params.sessionId as string;

      const session = await UserSession.findOneAndUpdate(
        { sessionId, userId: req.user.userId },
        { revoked: true },
        { new: true }
      );

      if (!session) {
        throw new AppError('Session not found', 404);
      }

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'SESSION_REVOKED',
        targetId: sessionId,
        requestId: req.requestId || 'session-revoke',
        ip: req.ip,
        metadata: { sessionId },
      });

      res.status(200).json({
        message: 'Session revoked successfully',
        sessionId,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeAllOtherSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      await UserSession.updateMany(
        { userId: req.user.userId },
        { revoked: true }
      );

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'ALL_SESSIONS_REVOKED',
        targetId: req.user.userId,
        requestId: req.requestId || 'sessions-revoke-all',
        ip: req.ip,
      });

      res.status(200).json({
        message: 'All device sessions have been revoked',
      });
    } catch (err) {
      next(err);
    }
  }
}
