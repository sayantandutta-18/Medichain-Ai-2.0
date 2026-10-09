import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { User, UserDocument, UserRole } from '../models/User.js';
import { UserSession } from '../models/UserSession.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { AppError } from '../middleware/errorHandler.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  lastLoginAt?: Date;
}

export class AuthService {
  private static getJwtSecret(): string {
    const secret = env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured.');
    }
    return secret;
  }

  public static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: (env.JWT_EXPIRES_IN || '15m') as any,
      issuer: 'medichain-api',
      audience: 'medichain-client',
    });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.getJwtSecret(), {
        issuer: 'medichain-api',
        audience: 'medichain-client',
      }) as TokenPayload;
      return decoded;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Access token has expired', 401);
      }
      throw new AppError('Invalid or malformed access token', 401);
    }
  }

  public static generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  public static async register(input: RegisterInput): Promise<{ user: AuthUserResponse; tokens: AuthTokens }> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new AppError('An account with this email address already exists', 409);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);

    const user = await User.create({
      email: input.email,
      passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      refreshTokenHash,
      schemaVersion: 1,
    });

    const accessToken = this.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  public static async login(
    input: LoginInput,
    clientInfo?: { userAgent?: string; ip?: string }
  ): Promise<{ user: AuthUserResponse; tokens: AuthTokens; sessionId?: string }> {
    const user = await User.findOne({ email: input.email });
    if (!user) {
      // Generic error message prevents account enumeration
      throw new AppError('Invalid email or password', 401);
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    const now = new Date();
    user.lastLoginAt = now;

    // Issue refreshed token pair with rotation
    const refreshToken = this.generateRefreshToken();
    user.refreshTokenHash = this.hashToken(refreshToken);
    await user.save();

    // Register active user session for multi-device management (Feature 26)
    const sessionId = randomUUID();
    const ua = clientInfo?.userAgent || 'Unknown Device';
    const isMobile = /mobile|iphone|android|ipad/i.test(ua);
    const isTablet = /tablet|ipad/i.test(ua);
    const deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' = isTablet
      ? 'Tablet'
      : isMobile
      ? 'Mobile'
      : 'Desktop';

    await UserSession.create({
      userId: user._id,
      sessionId,
      refreshTokenHash: user.refreshTokenHash,
      userAgent: ua.slice(0, 150),
      deviceType,
      ip: clientInfo?.ip || '127.0.0.1',
      lastActive: now,
      revoked: false,
      schemaVersion: 1,
    });

    const accessToken = this.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        lastLoginAt: user.lastLoginAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
      sessionId,
    };
  }

  public static async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    const hashed = this.hashToken(rawRefreshToken);

    // If an associated user session was remotely revoked, block token renewal (Feature 26)
    const existingSession = await UserSession.findOne({ refreshTokenHash: hashed });
    if (existingSession && existingSession.revoked) {
      throw new AppError('Session has been revoked remotely. Please log in again.', 401);
    }

    const user = await User.findOne({ refreshTokenHash: hashed });

    if (!user) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Refresh token rotation: issue brand new refresh token and invalidate old one
    const newRefreshToken = this.generateRefreshToken();
    const newHash = this.hashToken(newRefreshToken);
    user.refreshTokenHash = newHash;
    await user.save();

    if (existingSession) {
      existingSession.refreshTokenHash = newHash;
      existingSession.lastActive = new Date();
      await existingSession.save();
    }

    const newAccessToken = this.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
    await UserSession.updateMany({ userId }, { revoked: true });
  }

  public static async getProfile(userId: string): Promise<AuthUserResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
