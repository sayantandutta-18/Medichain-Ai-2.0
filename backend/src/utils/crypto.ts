import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  authTag: string;
  keyVersion: number;
}

/**
 * AES-256-GCM authenticated encryption service with AAD context binding (Master Rule 7).
 * Keys and plaintext are strictly never logged.
 */
export class CryptoService {
  public static getMasterKey(version = 1): Buffer {
    const rawKey = env.ENCRYPTION_KEY;
    if (!rawKey) {
      throw new Error('ENCRYPTION_KEY is not configured in environment.');
    }

    const keyBuffer = Buffer.from(rawKey, 'base64');
    if (keyBuffer.length !== 32) {
      throw new Error(
        `Invalid ENCRYPTION_KEY length: expected 32 bytes decoded from base64, got ${keyBuffer.length} bytes.`
      );
    }
    return keyBuffer;
  }

  public static encrypt(plaintext: Buffer, aad: string, keyVersion = 1): EncryptedPayload {
    const key = this.getMasterKey(keyVersion);
    const iv = randomBytes(12); // Standard 12-byte IV for AES-GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    cipher.setAAD(Buffer.from(aad, 'utf8'));

    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion,
    };
  }

  public static decrypt(
    payload: { iv: string; ciphertext: string; authTag: string; keyVersion?: number },
    aad: string
  ): Buffer {
    const keyVersion = payload.keyVersion || 1;
    const key = this.getMasterKey(keyVersion);

    const iv = Buffer.from(payload.iv, 'base64');
    if (iv.length !== 12) {
      throw new AppError('Invalid IV length for AES-256-GCM', 400);
    }

    const authTag = Buffer.from(payload.authTag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(authTag);

    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      throw new AppError('Decryption failed: ciphertext, authentication tag, or AAD tampering detected', 400);
    }
  }
}

export const encrypt = (plaintext: Buffer, aad: string): EncryptedPayload =>
  CryptoService.encrypt(plaintext, aad);

export const decrypt = (
  payload: { iv: string; ciphertext: string; authTag: string; keyVersion?: number },
  aad: string
): Buffer => CryptoService.decrypt(payload, aad);
