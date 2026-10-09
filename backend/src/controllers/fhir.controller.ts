import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { HealthMetric, MetricType } from '../models/HealthMetric.js';
import { can } from '../policy/policy.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const fhirBundleImportSchema = z.object({
  resourceType: z.literal('Bundle'),
  type: z.string().optional(),
  entry: z.array(
    z.object({
      resource: z.object({
        resourceType: z.string(),
        id: z.string().optional(),
        status: z.string().optional(),
        code: z.any().optional(),
        valueQuantity: z
          .object({
            value: z.number(),
            unit: z.string().optional(),
          })
          .optional(),
        effectiveDateTime: z.string().optional(),
        type: z.any().optional(),
        content: z.any().optional(),
      }).passthrough(),
    })
  ).min(1, 'FHIR Bundle must contain at least one entry'),
});

const KNOWN_METRIC_MAP: Record<string, MetricType> = {
  blood_pressure: 'BLOOD_PRESSURE',
  bp: 'BLOOD_PRESSURE',
  heart_rate: 'HEART_RATE',
  pulse: 'HEART_RATE',
  glucose: 'GLUCOSE',
  blood_glucose: 'GLUCOSE',
  cholesterol: 'CHOLESTEROL',
  weight: 'WEIGHT',
  temperature: 'TEMPERATURE',
  temp: 'TEMPERATURE',
};

function normalizeMetricType(codeText?: string): MetricType | null {
  if (!codeText) return null;
  const key = codeText.toLowerCase().replace(/[^a-z_]/g, '_');
  for (const [k, v] of Object.entries(KNOWN_METRIC_MAP)) {
    if (key.includes(k)) return v;
  }
  return null;
}

export class FhirController {
  public static async exportPatientBundle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const targetPatientId = (req.query.patientId as string) || req.user.userId;

      // Authorization check via central policy engine
      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:read',
        { recordPatientId: targetPatientId }
      );

      if (!allowed) {
        throw new AppError('Access Denied: Not authorized to export records for this patient', 403);
      }

      const [patientUser, records, metrics] = await Promise.all([
        User.findById(targetPatientId),
        MedicalRecord.find({ patientId: targetPatientId, deletedAt: null }),
        HealthMetric.find({ patientId: targetPatientId }),
      ]);

      if (!patientUser) {
        throw new AppError('Patient not found', 404);
      }

      const entries: any[] = [];

      // 1. Patient Resource
      entries.push({
        fullUrl: `urn:uuid:patient-${patientUser._id}`,
        resource: {
          resourceType: 'Patient',
          id: patientUser._id.toString(),
          identifier: [
            {
              system: 'urn:ietf:rfc:3986',
              value: patientUser._id.toString(),
            },
          ],
          name: [
            {
              use: 'official',
              family: patientUser.lastName,
              given: [patientUser.firstName],
            },
          ],
          telecom: [
            {
              system: 'email',
              value: patientUser.email,
            },
          ],
        },
      });

      // 2. DocumentReference Resources for each MedicalRecord
      for (const rec of records) {
        entries.push({
          fullUrl: `urn:uuid:record-${rec._id}`,
          resource: {
            resourceType: 'DocumentReference',
            id: rec._id.toString(),
            status: 'current',
            subject: {
              reference: `Patient/${patientUser._id}`,
            },
            date: (rec.createdAt || new Date()).toISOString(),
            type: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '34108-1',
                  display: rec.type,
                },
              ],
              text: rec.type,
            },
            content: [
              {
                attachment: {
                  contentType: rec.mimeType || 'application/pdf',
                  title: rec.originalFilename || rec.title,
                  hash: rec.sha256,
                },
              },
            ],
          },
        });
      }

      // 3. Observation Resources for HealthMetrics
      for (const m of metrics) {
        entries.push({
          fullUrl: `urn:uuid:observation-${m._id}`,
          resource: {
            resourceType: 'Observation',
            id: m._id.toString(),
            status: 'final',
            subject: {
              reference: `Patient/${patientUser._id}`,
            },
            effectiveDateTime: m.recordedAt.toISOString(),
            code: {
              text: m.metricType,
            },
            valueQuantity: {
              value: m.value,
              unit: m.unit,
            },
          },
        });
      }

      const bundle = {
        resourceType: 'Bundle',
        id: `bundle-${Date.now()}`,
        type: 'collection',
        timestamp: new Date().toISOString(),
        total: entries.length,
        entry: entries,
      };

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_READ',
        targetId: targetPatientId,
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { exportFormat: 'FHIR_R4', entriesCount: entries.length },
      });

      res.status(200).json(bundle);
    } catch (err) {
      next(err);
    }
  }

  public static async importBundle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      if (req.user.role !== 'PATIENT') {
        throw new AppError('Only patients can import records into their health profile', 403);
      }

      const validated = fhirBundleImportSchema.parse(req.body);
      let importedObservations = 0;

      for (const item of validated.entry) {
        const res = item.resource;
        if (res.resourceType === 'Observation' && res.valueQuantity) {
          const codeText = res.code?.text || res.code?.coding?.[0]?.display || res.code?.coding?.[0]?.code;
          const detectedType = normalizeMetricType(codeText) || 'HEART_RATE';
          const unit = res.valueQuantity.unit || (detectedType === 'HEART_RATE' ? 'bpm' : 'mg/dL');

          await HealthMetric.create({
            patientId: req.user.userId,
            metricType: detectedType,
            value: res.valueQuantity.value,
            unit,
            recordedAt: res.effectiveDateTime ? new Date(res.effectiveDateTime) : new Date(),
            notes: `Imported from FHIR R4 Bundle Observation ${res.id || ''}`.trim(),
            schemaVersion: 1,
          });

          importedObservations++;
        }
      }

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_CREATE',
        targetId: req.user.userId,
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { importFormat: 'FHIR_R4', importedObservations },
      });

      res.status(200).json({
        status: 'SUCCESS',
        importedObservations,
        message: `Successfully imported ${importedObservations} FHIR observation(s)`,
      });
    } catch (err) {
      next(err);
    }
  }
}
