import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const authRouter = Router();

// Rate limiter for authentication login endpoint to mitigate brute-force attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many login attempts. Please try again later.',
    statusCode: 429,
  },
  skip: () => process.env.NODE_ENV === 'test',
});

authRouter.post('/auth/register', AuthController.register);
authRouter.post('/auth/login', loginLimiter, AuthController.login);
authRouter.post('/auth/refresh', AuthController.refresh);
authRouter.get('/auth/me', requireAuth, AuthController.me);
authRouter.post('/auth/logout', requireAuth, AuthController.logout);
