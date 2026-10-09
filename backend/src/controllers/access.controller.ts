import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AccessRequest } from '../models/AccessRequest.js';
import { User } from '../models/User.js';
import { can } from '../policy/policy.js';
import { AuditService } from '../services/audit.service.js';
import { NotificationService } from '../services/notification.service.js';
import { createAccessRequestSchema, approveAccessRequestSchema } from '../validators/access.validator.js';
import { AppError } from '../middleware/errorHandler.js';
import { sha256 } from '../utils/hash.js';

export class AccessController {
  public static async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = createAccessRequestSchema.parse(req.body);
      const doctorId = req.user.userId;

      // Central policy check (Rule 6)
      const allowed = await can(
        { userId: doctorId, role: req.user.role },
        'access:request',
        { recordPatientId: validated.patientId, doctorId }
      );

      if (!allowed) {
        throw new AppError('Access request denied by policy (doctors only, self-requests prohibited)', 403);
      }

      // Check if active pending or approved request already exists
      const existing = await AccessRequest.findOne({
        patientId: validated.patientId,
        doctorId,
        status: { $in: ['PENDING', 'APPROVED'] },
        expiresAt: { $gt: new Date() },
      });

      if (existing) {
        throw new AppError('An active or pending access request already exists', 409);
      }

      // Check doctor verification status (Feature 01: PENDING/VERIFIED/REJECTED enforced server-side)
      const doctorUser = await User.findById(doctorId);
      if (doctorUser && doctorUser.verificationStatus === 'REJECTED') {
        throw new AppError('Forbidden: Practitioner verification is rejected. Access requests prohibited.', 403);
      }

      // Default temporary expiry for pending review: 7 days
      const pendingExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const requestDoc = await AccessRequest.create({
        patientId: validated.patientId,
        doctorId,
        purpose: validated.purpose,
        status: 'PENDING',
        scope: 'VIEW',
        expiresAt: pendingExpiresAt,
        schemaVersion: 1,
      });

      // Audit event
      await AuditService.record({
        actorId: doctorId,
        role: req.user.role,
        action: 'ACCESS_REQUESTED',
        targetId: requestDoc._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { patientId: validated.patientId, purpose: validated.purpose },
      });

      // Event-driven notification to patient (Feature 02)
      await NotificationService.notify({
        userId: validated.patientId,
        type: 'ACCESS_REQUEST',
        title: 'New Clinical Access Request',
        message: `Practitioner requested record access: ${validated.purpose}`,
        metadata: { requestId: requestDoc._id.toString() },
      });

      res.status(201).json({
        message: 'Access request created successfully',
        accessRequest: requestDoc,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const userId = req.user.userId;
      // Patient sees requests made to them; Doctor sees requests made by them
      const filter =
        req.user.role === 'PATIENT'
          ? { patientId: userId }
          : { doctorId: userId };

      const requests = await AccessRequest.find(filter)
        .populate('patientId', 'email firstName lastName')
        .populate('doctorId', 'email firstName lastName')
        .sort({ createdAt: -1 });

      res.status(200).json({ requests });
    } catch (err) {
      next(err);
    }
  }

  public static async approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const requestDoc = await AccessRequest.findById(req.params.id);
      if (!requestDoc) {
        throw new AppError('Access request not found', 404);
      }

      // Central policy check (patient only, must own the record)
      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'access:decide',
        { recordPatientId: requestDoc.patientId.toString() }
      );

      if (!allowed) {
        throw new AppError('Only the record owner can approve access requests', 403);
      }

      if (requestDoc.status !== 'PENDING') {
        throw new AppError(`Cannot approve request in status: ${requestDoc.status}`, 400);
      }

      const validated = approveAccessRequestSchema.parse(req.body);
      const now = new Date();

      // Generate verifiable consent receipt
      const receiptId = `receipt-${randomUUID()}`;
      const receiptPayload = {
        receiptId,
        requestId: requestDoc._id.toString(),
        patientId: requestDoc.patientId.toString(),
        doctorId: requestDoc.doctorId.toString(),
        status: 'APPROVED',
        scope: validated.scope,
        purpose: requestDoc.purpose,
        grantedAt: now.toISOString(),
        expiresAt: validated.expiresAt.toISOString(),
        issuer: 'MediChain-AI Consent Engine',
      };
      const receiptProof = sha256(JSON.stringify(receiptPayload));

      const receipt = {
        ...receiptPayload,
        cryptographicProof: receiptProof,
      };

      requestDoc.status = 'APPROVED';
      requestDoc.scope = validated.scope;
      requestDoc.expiresAt = validated.expiresAt;
      requestDoc.decidedAt = now;
      requestDoc.receipt = receipt;
      await requestDoc.save();

      // Audit event
      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'ACCESS_APPROVED',
        targetId: requestDoc._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { doctorId: requestDoc.doctorId.toString(), scope: validated.scope },
      });

      // Event-driven notification to doctor (Feature 02)
      await NotificationService.notify({
        userId: requestDoc.doctorId,
        type: 'ACCESS_APPROVED',
        title: 'Consent Granted',
        message: `Patient approved your access request for: ${requestDoc.purpose}`,
        metadata: { requestId: requestDoc._id.toString() },
      });

      res.status(200).json({
        message: 'Access request approved',
        accessRequest: requestDoc,
        receipt,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const requestDoc = await AccessRequest.findById(req.params.id);
      if (!requestDoc) {
        throw new AppError('Access request not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'access:decide',
        { recordPatientId: requestDoc.patientId.toString() }
      );

      if (!allowed) {
        throw new AppError('Only the record owner can reject access requests', 403);
      }

      if (requestDoc.status !== 'PENDING') {
        throw new AppError(`Cannot reject request in status: ${requestDoc.status}`, 400);
      }

      requestDoc.status = 'REJECTED';
      requestDoc.decidedAt = new Date();
      await requestDoc.save();

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'ACCESS_REJECTED',
        targetId: requestDoc._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      res.status(200).json({
        message: 'Access request rejected',
        accessRequest: requestDoc,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const requestDoc = await AccessRequest.findById(req.params.id);
      if (!requestDoc) {
        throw new AppError('Access request not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'access:revoke',
        { recordPatientId: requestDoc.patientId.toString() }
      );

      if (!allowed) {
        throw new AppError('Only the record owner can revoke access', 403);
      }

      if (requestDoc.status !== 'APPROVED') {
        throw new AppError(`Cannot revoke request with status: ${requestDoc.status}`, 400);
      }

      requestDoc.status = 'REVOKED';
      requestDoc.decidedAt = new Date();
      await requestDoc.save();

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'ACCESS_REVOKED',
        targetId: requestDoc._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      // Event-driven notification to doctor (Feature 02)
      await NotificationService.notify({
        userId: requestDoc.doctorId,
        type: 'ACCESS_REVOKED',
        title: 'Consent Revoked',
        message: `Patient has revoked record access for request: ${requestDoc._id.toString()}`,
        metadata: { requestId: requestDoc._id.toString() },
      });

      res.status(200).json({
        message: 'Access revoked successfully',
        accessRequest: requestDoc,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async downloadReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const requestDoc = await AccessRequest.findById(req.params.id);
      if (!requestDoc) {
        throw new AppError('Access request not found', 404);
      }

      // Patient must own the record or doctor must be the authorized doctor
      const isOwner = req.user.userId === requestDoc.patientId.toString();
      const isDoctor = req.user.userId === requestDoc.doctorId.toString();

      if (!isOwner && !isDoctor) {
        throw new AppError('Unauthorized to download this consent receipt', 403);
      }

      if (!requestDoc.receipt) {
        throw new AppError('Receipt is not available for this request', 404);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="consent-receipt-${requestDoc._id}.json"`);
      res.status(200).send(JSON.stringify(requestDoc.receipt, null, 2));
    } catch (err) {
      next(err);
    }
  }
}
