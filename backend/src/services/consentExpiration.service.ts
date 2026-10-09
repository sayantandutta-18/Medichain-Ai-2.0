import { AccessRequest } from '../models/AccessRequest.js';
import { AuditService } from './audit.service.js';
import { NotificationService } from './notification.service.js';

export interface ExpirationCheckResult {
  checkedAt: string;
  expiredCount: number;
  expiredIds: string[];
}

export class ConsentExpirationService {
  /**
   * Scans all APPROVED access requests that have passed their expiresAt timestamp.
   * Atomically transitions their status to EXPIRED, generates audit trail, and notifies parties.
   */
  public static async processExpiredConsents(): Promise<ExpirationCheckResult> {
    const now = new Date();
    const expiredList = await AccessRequest.find({
      status: 'APPROVED',
      expiresAt: { $lt: now },
    });

    const expiredIds: string[] = [];

    for (const request of expiredList) {
      request.status = 'EXPIRED';
      await request.save();

      expiredIds.push(request._id.toString());

      // Audit event for automatic consent expiration (Master Rule 9)
      await AuditService.record({
        actorId: request.patientId.toString(),
        role: 'PATIENT',
        action: 'CONSENT_EXPIRED',
        targetId: request._id.toString(),
        requestId: 'consent-expiry-worker',
        metadata: {
          doctorId: request.doctorId.toString(),
          expiredAt: now.toISOString(),
          originalExpiresAt: request.expiresAt.toISOString(),
        },
      });

      // Notify patient of consent expiration
      await NotificationService.notify({
        userId: request.patientId.toString(),
        type: 'ACCESS_REVOKED',
        title: 'Clinical Consent Expired',
        message: 'A practitioner consent grant has reached its scheduled expiration date.',
        metadata: { accessRequestId: request._id.toString(), doctorId: request.doctorId.toString() },
      });

      // Notify practitioner of consent expiration
      await NotificationService.notify({
        userId: request.doctorId.toString(),
        type: 'ACCESS_REVOKED',
        title: 'Patient Record Access Expired',
        message: 'Your authorized access window for patient records has expired.',
        metadata: { accessRequestId: request._id.toString(), patientId: request.patientId.toString() },
      });
    }

    return {
      checkedAt: now.toISOString(),
      expiredCount: expiredIds.length,
      expiredIds,
    };
  }
}
