import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification.js';
import { AppError } from '../middleware/errorHandler.js';

export class NotificationController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const notifications = await Notification.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .limit(50);

      const unreadCount = await Notification.countDocuments({
        userId: req.user.userId,
        read: false,
      });

      res.status(200).json({
        notifications,
        unreadCount,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.userId },
        { read: true },
        { new: true }
      );

      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      res.status(200).json({ notification });
    } catch (err) {
      next(err);
    }
  }

  public static async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      await Notification.updateMany({ userId: req.user.userId, read: false }, { read: true });

      res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }
}
