import 'express';
import { UserRole } from '../models/User.js';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: {
      userId: string;
      email: string;
      role: UserRole;
    };
  }
}
