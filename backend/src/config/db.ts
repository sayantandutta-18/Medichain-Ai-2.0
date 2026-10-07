import mongoose from 'mongoose';
import { env } from './env.js';

export function sanitizeDbError(error: unknown): string {
  if (!error) return 'Database error occurred';
  const raw = error instanceof Error ? error.message : String(error);
  // Redact MongoDB connection strings, credentials, and host auth details to prevent leaks
  return raw.replace(/mongodb(\+srv)?:\/\/[^\s@]+@[^\s/]+/gi, 'mongodb://[REDACTED]');
}

export async function connectDB(
  uri?: string,
  maxRetries = 3,
  retryDelayMs = 1000
): Promise<typeof mongoose> {
  const mongoUri = uri || env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Database connection failed: MONGODB_URI is not configured.');
  }

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      await mongoose.connect(mongoUri);
      return mongoose;
    } catch (err) {
      const sanitized = sanitizeDbError(err);
      if (attempt >= maxRetries) {
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts: ${sanitized}`);
      }
      await new Promise((res) => setTimeout(res, retryDelayMs * attempt));
    }
  }

  throw new Error('Failed to connect to MongoDB');
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
