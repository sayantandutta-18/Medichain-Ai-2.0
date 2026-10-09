import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { can } from '../policy/policy.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { sha256 } from '../utils/hash.js';
import { validateMagicBytes, stripExifMetadata, ALLOWED_MIME_TYPES } from '../utils/fileValidation.js';
import { AuditService } from '../services/audit.service.js';
import { listRecordsQuerySchema, updateRecordMetadataSchema } from '../validators/record.validator.js';
import { SuiClient } from '../blockchain/suiClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

export class RecordController {
  public static async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      // Verify user has permission to create records
      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:create'
      );
      if (!allowed) {
        throw new AppError('Only patients can upload medical records', 403);
      }

      if (!req.file) {
        throw new AppError('No file uploaded. Please attach a medical record file.', 400);
      }

      const file = req.file;

      // 1. MIME allow-list validation
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new AppError(
          `Unsupported file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
          400
        );
      }

      // 2. File size validation
      const maxSizeBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new AppError(
          `File size exceeds maximum allowed limit of ${env.MAX_UPLOAD_MB} MB`,
          400
        );
      }

      // 3. Magic-byte signature verification
      const isValidMagic = validateMagicBytes(file.buffer, file.mimetype);
      if (!isValidMagic) {
        throw new AppError(
          'File verification failed: magic bytes signature does not match claimed file type',
          400
        );
      }

      // 4. SHA-256 hash computation
      const rawHash = sha256(file.buffer);

      // 5. Duplicate check for same patient
      const patientId = req.user.userId;
      const duplicate = await MedicalRecord.findOne({
        patientId,
        sha256: rawHash,
        deletedAt: null,
      });

      if (duplicate) {
        throw new AppError(
          'Duplicate document detected: this exact file has already been uploaded to your records',
          409
        );
      }

      // 6. Strip EXIF metadata from images
      const sanitizedBuffer = stripExifMetadata(file.buffer, file.mimetype);

      // 7. AES-256-GCM encryption with bound AAD
      const recordId = new Types.ObjectId();
      const aad = `${recordId.toString()}|${patientId}`;
      const encrypted = encrypt(sanitizedBuffer, aad);

      // 8. Persist record
      const title = (req.body.title as string) || file.originalname || 'Medical Document';
      const recordType = (req.body.type as string) || 'LAB_REPORT';

      const recordDoc = await MedicalRecord.create({
        _id: recordId,
        patientId: new Types.ObjectId(patientId),
        title: title.trim(),
        type: recordType,
        status: 'PENDING_ANCHOR',
        encryptedPayload: encrypted,
        sha256: rawHash,
        keyVersion: encrypted.keyVersion,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: sanitizedBuffer.length,
        deletedAt: null,
        schemaVersion: 1,
      });

      // 9. Audit event: RECORD_CREATED
      await AuditService.record({
        actorId: patientId,
        role: req.user.role,
        action: 'RECORD_CREATED',
        targetId: recordDoc._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { title, mimeType: file.mimetype, size: sanitizedBuffer.length },
      });

      res.status(201).json({
        message: 'Medical record uploaded and encrypted successfully',
        record: {
          id: recordDoc._id.toString(),
          patientId: recordDoc.patientId.toString(),
          title: recordDoc.title,
          type: recordDoc.type,
          status: recordDoc.status,
          sha256: recordDoc.sha256,
          keyVersion: recordDoc.keyVersion,
          originalFilename: recordDoc.originalFilename,
          mimeType: recordDoc.mimeType,
          sizeBytes: recordDoc.sizeBytes,
          createdAt: recordDoc.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const query = listRecordsQuerySchema.parse(req.query);
      let targetPatientId = req.user.userId;

      if (req.user.role === 'DOCTOR') {
        if (!query.patientId) {
          throw new AppError('Doctors must specify patientId to query records', 400);
        }
        targetPatientId = query.patientId;

        // Verify doctor consent
        const allowed = await can(
          { userId: req.user.userId, role: req.user.role },
          'record:read',
          { recordPatientId: targetPatientId }
        );
        if (!allowed) {
          await AuditService.record({
            actorId: req.user.userId,
            role: req.user.role,
            action: 'RECORD_VIEW_DENIED',
            targetId: targetPatientId,
            requestId: req.requestId || 'unknown',
            ip: req.ip,
          });
          throw new AppError('Unauthorized: Doctor has no active approved consent for this patient', 403);
        }
      }

      const mongoFilter: any = {
        patientId: targetPatientId,
        deletedAt: null,
      };

      if (query.title) {
        mongoFilter.title = { $regex: query.title, $options: 'i' };
      }
      if (query.type) {
        mongoFilter.type = query.type;
      }
      if (query.status) {
        mongoFilter.status = query.status;
      }
      if (query.dateFrom || query.dateTo) {
        mongoFilter.createdAt = {};
        if (query.dateFrom) mongoFilter.createdAt.$gte = query.dateFrom;
        if (query.dateTo) mongoFilter.createdAt.$lte = query.dateTo;
      }

      const skip = (query.page - 1) * query.limit;
      const [records, total] = await Promise.all([
        MedicalRecord.find(mongoFilter)
          .select('-encryptedPayload.ciphertext')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(query.limit),
        MedicalRecord.countDocuments(mongoFilter),
      ]);

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_VIEWED',
        targetId: targetPatientId,
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      res.status(200).json({
        records,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const record = await MedicalRecord.findOne({ _id: req.params.id, deletedAt: null });
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:read',
        { recordPatientId: record.patientId.toString() }
      );

      if (!allowed) {
        await AuditService.record({
          actorId: req.user.userId,
          role: req.user.role,
          action: 'RECORD_VIEW_DENIED',
          targetId: record._id.toString(),
          requestId: req.requestId || 'unknown',
          ip: req.ip,
        });
        throw new AppError('Unauthorized: Access denied to this medical record', 403);
      }

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_VIEWED',
        targetId: record._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      const responseObj = record.toObject();
      delete (responseObj as any).encryptedPayload.ciphertext;

      res.status(200).json({ record: responseObj });
    } catch (err) {
      next(err);
    }
  }

  public static async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const record = await MedicalRecord.findOne({ _id: req.params.id, deletedAt: null });
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:download',
        { recordPatientId: record.patientId.toString() }
      );

      if (!allowed) {
        await AuditService.record({
          actorId: req.user.userId,
          role: req.user.role,
          action: 'RECORD_DOWNLOAD_DENIED',
          targetId: record._id.toString(),
          requestId: req.requestId || 'unknown',
          ip: req.ip,
        });
        throw new AppError('Unauthorized: You do not have permission to download this record', 403);
      }

      const aad = `${record._id.toString()}|${record.patientId.toString()}`;
      const decryptedBytes = decrypt(record.encryptedPayload, aad);

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_DOWNLOADED',
        targetId: record._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${record.originalFilename || 'medical-record.bin'}"`
      );
      res.status(200).send(decryptedBytes);
    } catch (err) {
      next(err);
    }
  }

  public static async updateMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const record = await MedicalRecord.findOne({ _id: req.params.id, deletedAt: null });
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:update',
        { recordPatientId: record.patientId.toString() }
      );

      if (!allowed) {
        throw new AppError('Unauthorized: Doctors or non-owners cannot update records', 403);
      }

      const validated = updateRecordMetadataSchema.parse(req.body);
      if (validated.title) record.title = validated.title;
      if (validated.type) record.type = validated.type;

      await record.save();

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_UPDATED',
        targetId: record._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      res.status(200).json({
        message: 'Record metadata updated successfully',
        record,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const record = await MedicalRecord.findOne({ _id: req.params.id, deletedAt: null });
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:delete',
        { recordPatientId: record.patientId.toString() }
      );

      if (!allowed) {
        throw new AppError('Unauthorized: Doctors or non-owners cannot delete records', 403);
      }

      // Soft delete
      record.deletedAt = new Date();
      await record.save();

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_DELETED',
        targetId: record._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      res.status(200).json({ message: 'Record deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async anchor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const record = await MedicalRecord.findOne({ _id: req.params.id, deletedAt: null });
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:update',
        { recordPatientId: record.patientId.toString() }
      );

      if (!allowed) {
        throw new AppError('Only the record owner can anchor records to the blockchain', 403);
      }

      const result = await SuiClient.anchorRecord(record._id.toString(), req.user.userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const record = await MedicalRecord.findOne({ _id: req.params.id, deletedAt: null });
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:read',
        { recordPatientId: record.patientId.toString() }
      );

      if (!allowed) {
        throw new AppError('Unauthorized to verify this medical record', 403);
      }

      const result = await SuiClient.verifyRecord(record._id.toString(), req.user.userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      let targetPatientId = req.user.userId;
      if (req.user.role === 'DOCTOR') {
        const patientId = req.query.patientId as string;
        if (!patientId) {
          throw new AppError('Doctors must specify patientId to view timeline', 400);
        }
        targetPatientId = patientId;

        const allowed = await can(
          { userId: req.user.userId, role: req.user.role },
          'record:read',
          { recordPatientId: targetPatientId }
        );
        if (!allowed) {
          throw new AppError('Unauthorized: Doctor has no active approved consent for this patient', 403);
        }
      }

      const filter: any = { patientId: targetPatientId, deletedAt: null };
      if (req.query.type && typeof req.query.type === 'string' && req.query.type !== 'ALL') {
        filter.type = req.query.type;
      }

      const records = await MedicalRecord.find(filter)
        .select('-encryptedPayload.ciphertext')
        .sort({ createdAt: -1 });

      const timelineByYear: Record<string, any[]> = {};
      for (const rec of records) {
        const year = (rec.createdAt ? new Date(rec.createdAt) : new Date()).getFullYear().toString();
        if (!timelineByYear[year]) {
          timelineByYear[year] = [];
        }
        timelineByYear[year].push(rec);
      }

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'TIMELINE_VIEWED',
        targetId: targetPatientId,
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      const timelineArray = Object.keys(timelineByYear)
        .sort((a, b) => Number(b) - Number(a))
        .map((year) => ({
          year: Number(year),
          records: timelineByYear[year],
        }));

      res.status(200).json({
        timeline: timelineArray,
        timelineByYear,
        totalRecords: records.length,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const record = await MedicalRecord.findOne({ _id: req.params.id, deletedAt: null });
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:update',
        { recordPatientId: record.patientId.toString() }
      );
      if (!allowed) {
        throw new AppError('Only the record owner can upload new versions', 403);
      }

      if (!req.file) {
        throw new AppError('No file uploaded for new version', 400);
      }

      const file = req.file;
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new AppError(`Unsupported file type: ${file.mimetype}`, 400);
      }

      const isValidMagic = validateMagicBytes(file.buffer, file.mimetype);
      if (!isValidMagic) {
        throw new AppError('Magic bytes signature mismatch', 400);
      }

      const fileBytes = stripExifMetadata(file.buffer, file.mimetype);
      const newHash = sha256(fileBytes);

      const currentVerNum = record.currentVersion || 1;
      const archivedVersion = {
        versionNumber: currentVerNum,
        sha256: record.sha256,
        encryptedPayload: record.encryptedPayload,
        originalFilename: record.originalFilename,
        sizeBytes: record.sizeBytes,
        changeNote: req.body.changeNote || `Version ${currentVerNum} archive`,
        createdAt: record.updatedAt || new Date(),
      };

      if (!record.versions) {
        record.versions = [];
      }
      record.versions.push(archivedVersion as any);

      const aad = `${record._id.toString()}|${record.patientId.toString()}`;
      const encrypted = encrypt(fileBytes, aad);

      record.currentVersion = currentVerNum + 1;
      record.sha256 = newHash;
      record.encryptedPayload = {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyVersion: 1,
      };
      record.originalFilename = file.originalname;
      record.mimeType = file.mimetype;
      record.sizeBytes = file.size;
      record.status = 'ENCRYPTED';
      await record.save();

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_VERSION_CREATED',
        targetId: record._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { newVersion: record.currentVersion, sha256: newHash },
      });

      res.status(201).json({
        status: 'SUCCESS',
        message: 'New record version created successfully',
        currentVersion: record.currentVersion,
        sha256: newHash,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const record = await MedicalRecord.findOne({ _id: req.params.id, deletedAt: null });
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:read',
        { recordPatientId: record.patientId.toString() }
      );
      if (!allowed) {
        throw new AppError('Unauthorized to inspect record versions', 403);
      }

      const versionHistory = (record.versions || []).map((v) => ({
        versionNumber: v.versionNumber,
        sha256: v.sha256,
        originalFilename: v.originalFilename,
        sizeBytes: v.sizeBytes,
        changeNote: v.changeNote,
        createdAt: v.createdAt,
      }));

      versionHistory.push({
        versionNumber: record.currentVersion || 1,
        sha256: record.sha256,
        originalFilename: record.originalFilename,
        sizeBytes: record.sizeBytes,
        changeNote: 'Current active version',
        createdAt: record.updatedAt || new Date(),
      });

      res.status(200).json({
        currentVersion: record.currentVersion || 1,
        versions: versionHistory.sort((a, b) => b.versionNumber - a.versionNumber),
      });
    } catch (err) {
      next(err);
    }
  }
}
