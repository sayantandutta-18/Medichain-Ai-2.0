import { Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../models/AuditLog.js';
import { sha256 } from '../utils/hash.js';

export interface AuditEventInput {
  actorId: string | Types.ObjectId;
  role: string;
  action: string;
  targetId?: string;
  requestId: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  private static canonicalStringify(obj: Record<string, any>): string {
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: Record<string, any> = {};
    for (const key of sortedKeys) {
      if (obj[key] !== undefined) {
        sortedObj[key] = obj[key];
      }
    }
    return JSON.stringify(sortedObj);
  }

  public static async record(event: AuditEventInput): Promise<AuditLogDocument> {
    // Retrieve the most recent log entry to determine prevHash
    const lastEntry = await AuditLog.findOne().sort({ createdAt: -1 });
    const prevHash = lastEntry ? lastEntry.hash : 'GENESIS_HASH_MEDICHAIN_000000000000000000000000000000000000';

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

    const canonicalJson = this.canonicalStringify(payloadToHash);
    const hash = sha256(canonicalJson + prevHash);

    const logEntry = await AuditLog.create({
      actorId,
      role: event.role,
      action: event.action,
      targetId: event.targetId,
      requestId: event.requestId,
      ip: event.ip,
      metadata: event.metadata,
      prevHash,
      hash,
      createdAt,
      schemaVersion: 1,
    });

    return logEntry;
  }
}
