import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AppError } from './errorHandler.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required: Missing or invalid Authorization header', 401));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(new AppError('Authentication required: Bearer token is empty', 401));
  }

  try {
    const payload = AuthService.verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}
