import { AccessRequest } from '../models/AccessRequest.js';

export type PolicyAction =
  | 'record:read'
  | 'record:download'
  | 'record:update'
  | 'record:delete'
  | 'record:create'
  | 'access:request'
  | 'access:decide'
  | 'access:revoke'
  | 'audit:read-own';

export interface PolicyActor {
  userId: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

export interface PolicyResource {
  recordPatientId?: string;
  doctorId?: string;
  targetActorId?: string;
  requestId?: string;
}

/**
 * Central authorization policy engine for MediChain-AI (Master Rule 6).
 * Deny by default. All access and modification rights must match an explicit rule.
 */
export async function can(
  actor: PolicyActor,
  action: PolicyAction,
  resource?: PolicyResource
): Promise<boolean> {
  // DENY BY DEFAULT
  if (!actor || !actor.userId || !actor.role) {
    return false;
  }

  // 1. Audit read-own rule: actor can read their own audit logs
  if (action === 'audit:read-own') {
    return !!resource?.targetActorId && actor.userId === resource.targetActorId;
  }

  // 2. Access request lifecycle actions
  if (action === 'access:request') {
    // Only DOCTOR can request access; doctor cannot self-request
    if (actor.role !== 'DOCTOR') return false;
    if (resource?.recordPatientId && resource.recordPatientId === actor.userId) {
      return false; // Self-request rejected
    }
    return true;
  }

  if (action === 'access:decide' || action === 'access:revoke') {
    // Only the PATIENT who owns the resource can decide or revoke access
    if (actor.role !== 'PATIENT') return false;
    return !!resource?.recordPatientId && actor.userId === resource.recordPatientId;
  }

  // 3. Record creation: only patients can upload/create their records
  if (action === 'record:create') {
    return actor.role === 'PATIENT';
  }

  // 4. Patient actions on records: full access to own records, zero access to others
  if (actor.role === 'PATIENT') {
    if (!resource?.recordPatientId) return false;
    return actor.userId === resource.recordPatientId;
  }

  // 5. Doctor actions on records
  if (actor.role === 'DOCTOR') {
    // Doctors can NEVER update or delete records
    if (action === 'record:update' || action === 'record:delete') {
      return false;
    }

    if (action === 'record:read' || action === 'record:download') {
      if (!resource?.recordPatientId) return false;

      // Consent verification: requires APPROVED, unexpired, unrevoked AccessRequest
      const now = new Date();
      const consent = await AccessRequest.findOne({
        patientId: resource.recordPatientId,
        doctorId: actor.userId,
        status: 'APPROVED',
        expiresAt: { $gt: now },
      });

      if (!consent) {
        return false;
      }

      // Verify scope
      if (action === 'record:read') {
        return ['VIEW', 'DOWNLOAD', 'FULL'].includes(consent.scope);
      }

      if (action === 'record:download') {
        return ['DOWNLOAD', 'FULL'].includes(consent.scope);
      }
    }
  }

  // Default: Deny
  return false;
}
