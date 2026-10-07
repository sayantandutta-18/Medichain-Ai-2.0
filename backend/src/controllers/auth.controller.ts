import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator.js';
import { AppError } from '../middleware/errorHandler.js';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);
      res.status(201).json({
        message: 'Account successfully registered',
        user: result.user,
        tokens: result.tokens,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);
      res.status(200).json({
        message: 'Login successful',
        user: result.user,
        tokens: result.tokens,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const tokens = await AuthService.refreshTokens(validated.refreshToken);
      res.status(200).json({
        message: 'Tokens refreshed successfully',
        tokens,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const profile = await AuthService.getProfile(req.user.userId);
      res.status(200).json({ user: profile });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await AuthService.logout(req.user.userId);
      }
      res.status(200).json({ message: 'Successfully logged out' });
    } catch (err) {
      next(err);
    }
  }
}
