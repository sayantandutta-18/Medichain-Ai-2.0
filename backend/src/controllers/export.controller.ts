import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { EmergencyProfile } from '../models/EmergencyProfile.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { HealthMetric } from '../models/HealthMetric.js';
import { Prescription } from '../models/Prescription.js';
import { HealthGoal } from '../models/HealthGoal.js';
import { ClinicalNote } from '../models/ClinicalNote.js';
import { CaregiverAccess } from '../models/CaregiverAccess.js';
import { can } from '../policy/policy.js';
import { sha256 } from '../utils/hash.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';

export class ExportController {
  public static async exportHealthSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const targetPatientId = (req.query.patientId as string) || req.user.userId;

      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:read',
        { recordPatientId: targetPatientId }
      );

      if (!allowed) {
        throw new AppError('Unauthorized to export health summary for this patient', 403);
      }

      const [patient, profile, records, metrics, prescriptions, goals, notesCount, proxies] =
        await Promise.all([
          User.findById(targetPatientId).select('firstName lastName email role createdAt'),
          EmergencyProfile.findOne({ patientId: targetPatientId }),
          MedicalRecord.find({ patientId: targetPatientId, deletedAt: null })
            .select('_id type originalFilename sha256 suiAnchorStatus suiTxDigest createdAt')
            .sort({ createdAt: -1 }),
          HealthMetric.find({ patientId: targetPatientId }).sort({ recordedAt: -1 }).limit(30),
          Prescription.find({ patientId: targetPatientId }).sort({ createdAt: -1 }),
          HealthGoal.find({ patientId: targetPatientId }).sort({ createdAt: -1 }),
          ClinicalNote.countDocuments({ patientId: targetPatientId }),
          CaregiverAccess.find({
            patientId: targetPatientId,
            revoked: false,
            expiresAt: { $gt: new Date() },
          }),
        ]);

      if (!patient) {
        throw new AppError('Patient profile not found', 404);
      }

      const dossier = {
        dossierVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        patient: {
          id: patient._id.toString(),
          name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
          email: patient.email,
          accountCreated: patient.createdAt,
        },
        emergencyProfile: profile
          ? {
              bloodGroup: profile.bloodGroup || 'Unknown',
              allergies: profile.allergies || [],
              conditionsSummary: profile.conditionsSummary || '',
              emergencyContacts: profile.emergencyContacts || [],
            }
          : null,
        medicalRecords: records.map((r) => ({
          recordId: r._id.toString(),
          type: r.type,
          originalFilename: r.originalFilename,
          sha256IntegrityHash: r.sha256,
          blockchainAnchorStatus: r.blockchainAnchor?.status || 'PENDING',
          blockchainTxDigest: r.blockchainAnchor?.txDigest || null,
          createdAt: r.createdAt,
        })),
        recentMetrics: metrics.map((m) => ({
          metricType: m.metricType,
          value: m.value,
          secondaryValue: m.secondaryValue,
          unit: m.unit,
          recordedAt: m.recordedAt,
        })),
        prescriptions: prescriptions.map((p) => ({
          id: p._id.toString(),
          medications: p.medications,
          notes: p.notes,
          prescribedDate: p.createdAt,
        })),
        healthGoals: goals.map((g) => ({
          metricType: g.metricType,
          targetValue: g.targetValue,
          initialValue: g.initialValue,
          unit: g.unit,
          status: g.status,
          targetDate: g.targetDate,
        })),
        clinicalNotesSummary: {
          totalEncounters: notesCount,
          confidentialityNotice: 'Clinical notes are encrypted E2EE with patient master key.',
        },
        activeProxies: proxies.map((pr) => ({
          caregiverId: pr.caregiverId.toString(),
          scopes: pr.scopes,
          expiresAt: pr.expiresAt,
        })),
      };

      const payloadString = JSON.stringify(dossier);
      const integrityHash = sha256(payloadString);

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_READ',
        targetId: targetPatientId,
        requestId: req.requestId || 'export-dossier',
        ip: req.ip,
        metadata: {
          action: 'DOSSIER_EXPORT',
          recordCount: records.length,
          integrityHash,
        },
      });

      if (req.query.download === 'true') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="medichain-health-dossier-${targetPatientId}.json"`
        );
        res.status(200).send(JSON.stringify({ ...dossier, integrityHash }, null, 2));
        return;
      }

      res.status(200).json({
        dossier,
        integrityHash,
        recordCount: records.length,
      });
    } catch (err) {
      next(err);
    }
  }
}
