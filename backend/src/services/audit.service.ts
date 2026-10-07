import { Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../models/AuditLog.js';
import { sha256 } from '../utils/hash.js';

export const GENESIS_HASH = 'GENESIS_HASH_MEDICHAIN_000000000000000000000000000000000000';

export type AuditAction =
  | 'REGISTER'
  | 'LOGIN'
  | 'RECORD_CREATED'
  | 'RECORD_VIEWED'
  | 'RECORD_VIEW_DENIED'
  | 'RECORD_UPDATED'
  | 'RECORD_DELETED'
  | 'RECORD_DOWNLOADED'
  | 'RECORD_DOWNLOAD_DENIED'
  | 'ACCESS_REQUESTED'
  | 'ACCESS_APPROVED'
  | 'ACCESS_REJECTED'
  | 'ACCESS_REVOKED'
  | 'VERIFICATION'
  | 'AI_ANALYSIS';

export interface AuditEventInput {
  actorId: string | Types.ObjectId;
  role: string;
  action: AuditAction | string;
  targetId?: string;
  requestId: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  valid: boolean;
  totalEntries: number;
  brokenIndex?: number;
  logId?: string;
  reason?: string;
  expectedHash?: string;
  actualHash?: string;
}

export class AuditService {
  public static canonicalStringify(obj: Record<string, any>): string {
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: Record<string, any> = {};
    for (const key of sortedKeys) {
      if (obj[key] !== undefined) {
        sortedObj[key] = obj[key];
      }
    }
    return JSON.stringify(sortedObj);
  }

  public static computeEntryHash(
    entry: {
      action: string;
      actorId: string;
      createdAt: string;
      prevHash: string;
      requestId: string;
      role: string;
      targetId: string;
    },
    prevHash: string
  ): string {
    const canonicalJson = this.canonicalStringify(entry);
    return sha256(canonicalJson + prevHash);
  }

  /**
   * Sanitizes metadata to strictly exclude passwords, tokens, or medical document text (Rule 9).
   */
  private static sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    const sanitized: Record<string, any> = {};
    const prohibitedKeys = ['password', 'token', 'secret', 'mnemonic', 'body', 'text', 'document', 'content'];

    for (const [key, value] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      if (!prohibitedKeys.some((p) => lower.includes(p))) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  public static async record(event: AuditEventInput): Promise<AuditLogDocument> {
    // Find the latest audit log entry to establish the cryptographic previous hash
    const lastEntry = await AuditLog.findOne().sort({ createdAt: -1, _id: -1 });
    const prevHash = lastEntry ? lastEntry.hash : GENESIS_HASH;

    const actorId = typeof event.actorId === 'string' ? new Types.ObjectId(event.actorId) : event.actorId;
    const createdAt = new Date();

    const payloadToHash = {
      action: event.action,
      actorId: actorId.toString(),
      createdAt: createdAt.toISOString(),
      prevHash,
      requestId: event.requestId,
      role: event.role,
      targetId: event.targetId || '',
    };

    const hash = this.computeEntryHash(payloadToHash, prevHash);
    const sanitizedMeta = this.sanitizeMetadata(event.metadata);

    const logEntry = await AuditLog.create({
      actorId,
      role: event.role,
      action: event.action,
      targetId: event.targetId,
      requestId: event.requestId,
      ip: event.ip,
      metadata: sanitizedMeta,
      prevHash,
      hash,
      createdAt,
      schemaVersion: 1,
    });

    return logEntry;
  }

  /**
   * Recomputes the entire audit log hash chain and pinpoints any broken link or tampering.
   */
  public static async verifyChain(): Promise<VerificationResult> {
    const entries = await AuditLog.find().sort({ createdAt: 1, _id: 1 });
    let currentExpectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // 1. Verify prevHash link
      if (entry.prevHash !== currentExpectedPrevHash) {
        return {
          valid: false,
          totalEntries: entries.length,
          brokenIndex: i,
          logId: entry._id.toString(),
          reason: `Previous hash mismatch: expected '${currentExpectedPrevHash}', found '${entry.prevHash}'`,
        };
      }

      // 2. Recompute hash
      const payload = {
        action: entry.action,
        actorId: entry.actorId.toString(),
        createdAt: entry.createdAt.toISOString(),
        prevHash: entry.prevHash,
        requestId: entry.requestId,
        role: entry.role,
        targetId: entry.targetId || '',
      };

      const expectedHash = this.computeEntryHash(payload, entry.prevHash);

      // 3. Verify entry hash
      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          totalEntries: entries.length,
          brokenIndex: i,
          logId: entry._id.toString(),
          reason: `Entry hash corrupted or tampered: expected '${expectedHash}', found '${entry.hash}'`,
          expectedHash,
          actualHash: entry.hash,
        };
      }

      currentExpectedPrevHash = entry.hash;
    }

    return {
      valid: true,
      totalEntries: entries.length,
    };
  }
}
