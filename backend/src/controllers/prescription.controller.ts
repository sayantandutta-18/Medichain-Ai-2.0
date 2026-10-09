import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Prescription } from '../models/Prescription.js';
import { can } from '../policy/policy.js';
import { NotificationService } from '../services/notification.service.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const medicationItemSchema = z.object({
  name: z.string().min(1).max(100),
  dosage: z.string().min(1).max(50),
  frequency: z.string().min(1).max(50),
  duration: z.string().min(1).max(50),
  instructions: z.string().max(200).optional(),
});

const createPrescriptionSchema = z.object({
  patientId: z.string().min(1),
  recordId: z.string().optional(),
  medications: z.array(medicationItemSchema).min(1),
  notes: z.string().max(500).optional(),
});

const checkInteractionsSchema = z.object({
  medications: z.array(z.string().min(1)).optional(),
});

interface InteractionRule {
  drugsA: string[];
  drugsB: string[];
  title: string;
  severity: 'HIGH' | 'MODERATE' | 'LOW';
  description: string;
}

const KNOWN_INTERACTION_RULES: InteractionRule[] = [
  {
    drugsA: ['warfarin', 'coumadin'],
    drugsB: ['aspirin', 'ibuprofen', 'naproxen', 'advil', 'motrin', 'nsaid'],
    title: 'Anticoagulant + NSAID / Antiplatelet Interaction',
    severity: 'HIGH',
    description: 'Concurrent administration substantially elevates risk of major gastrointestinal hemorrhage and bleeding events.',
  },
  {
    drugsA: ['sildenafil', 'viagra', 'tadalafil', 'cialis'],
    drugsB: ['nitroglycerin', 'nitro', 'isosorbide', 'nitrate'],
    title: 'PDE5 Inhibitor + Organic Nitrate Interaction',
    severity: 'HIGH',
    description: 'Concomitant use may precipitate severe, refractory systemic hypotension and cardiovascular collapse.',
  },
  {
    drugsA: ['metformin', 'glucophage'],
    drugsB: ['contrast', 'iodinated contrast'],
    title: 'Metformin + Radiopaque Contrast Interaction',
    severity: 'HIGH',
    description: 'Administration of iodinated contrast in patients receiving metformin can cause contrast-induced acute renal impairment and lactic acidosis.',
  },
  {
    drugsA: ['lisinopril', 'losartan', 'enalapril', 'ramipril'],
    drugsB: ['spironolactone', 'potassium', 'k-dur'],
    title: 'RAAS Inhibitor + Potassium Retention Interaction',
    severity: 'HIGH',
    description: 'Combining ACE inhibitors or ARBs with potassium supplements or potassium-sparing diuretics significantly increases risk of hyperkalemia.',
  },
  {
    drugsA: ['fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'lexapro', 'zoloft', 'prozac'],
    drugsB: ['tramadol', 'phenelzine', 'selegiline', 'maoi'],
    title: 'SSRI + Serotonergic Agent / MAOI Interaction',
    severity: 'HIGH',
    description: 'Concurrent serotonergic agents can precipitate Serotonin Syndrome, characterized by hyperthermia, autonomic instability, and neuromuscular rigidity.',
  },
  {
    drugsA: ['ciprofloxacin', 'levofloxacin', 'cipro', 'levaquin'],
    drugsB: ['antacid', 'calcium', 'iron', 'maalox', 'tums'],
    title: 'Fluoroquinolone + Polyvalent Cation Chelation',
    severity: 'MODERATE',
    description: 'Cation chelation severely impairs oral antibiotic absorption and reduces therapeutic systemic exposure.',
  },
  {
    drugsA: ['simvastatin', 'atorvastatin', 'lipitor', 'zocor'],
    drugsB: ['amiodarone', 'clarithromycin', 'diltiazem'],
    title: 'Statin + CYP3A4 Inhibitor Interaction',
    severity: 'MODERATE',
    description: 'Inhibition of statin clearance increases plasma levels, elevating risk of myopathy and rhabdomyolysis.',
  },
  {
    drugsA: ['clopidogrel', 'plavix'],
    drugsB: ['omeprazole', 'prilosec'],
    title: 'Clopidogrel + Omeprazole CYP2C19 Inhibition',
    severity: 'MODERATE',
    description: 'Omeprazole reduces bioactivation of clopidogrel to its active metabolite, potentially diminishing antiplatelet efficacy.',
  },
];

export function evaluateInteractions(medicationNames: string[]) {
  const normalized = medicationNames.map((m) => m.toLowerCase().trim());
  const detected: any[] = [];

  for (const rule of KNOWN_INTERACTION_RULES) {
    const matchA = normalized.find((name) => rule.drugsA.some((a) => name.includes(a)));
    const matchB = normalized.find((name) => rule.drugsB.some((b) => name.includes(b)));

    if (matchA && matchB && matchA !== matchB) {
      detected.push({
        title: rule.title,
        severity: rule.severity,
        drugA: matchA,
        drugB: matchB,
        description: rule.description,
      });
    }
  }

  return detected;
}

export class PrescriptionController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      if (req.user.role !== 'DOCTOR') {
        throw new AppError('Only verified physicians can issue prescriptions', 403);
      }

      const validated = createPrescriptionSchema.parse(req.body);

      // Verify doctor consent for this patient
      const allowed = await can(
        { userId: req.user.userId, role: req.user.role },
        'record:read',
        { recordPatientId: validated.patientId }
      );

      if (!allowed) {
        throw new AppError('Access Denied: No active consent to issue prescriptions for this patient', 403);
      }

      // Automated check for interactions among new meds
      const medNames = validated.medications.map((m) => m.name);
      const interactions = evaluateInteractions(medNames);

      const prescription = await Prescription.create({
        patientId: validated.patientId,
        doctorId: req.user.userId,
        recordId: validated.recordId ? new Types.ObjectId(validated.recordId) : undefined,
        medications: validated.medications,
        notes: validated.notes,
        schemaVersion: 1,
      });

      await NotificationService.notify({
        userId: validated.patientId,
        type: 'PRESCRIPTION_ISSUED',
        title: 'New Prescription Issued',
        message: `Your physician has issued a new prescription with ${validated.medications.length} medication(s).`,
        metadata: { prescriptionId: prescription._id.toString() },
      });

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_CREATE',
        targetId: validated.patientId,
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: {
          prescriptionId: prescription._id.toString(),
          medicationCount: validated.medications.length,
          interactionsFound: interactions.length,
        },
      });

      res.status(201).json({
        status: 'SUCCESS',
        prescription,
        interactionWarnings: interactions,
        disclaimer: 'Informational interaction screening tool only. Not diagnostic or prescribing advice.',
      });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      let filter: any = {};

      if (req.user.role === 'PATIENT') {
        filter = { patientId: req.user.userId };
      } else if (req.user.role === 'DOCTOR') {
        const patientId = req.query.patientId as string;
        if (!patientId) {
          // Doctor listing their issued prescriptions
          filter = { doctorId: req.user.userId };
        } else {
          // Verify doctor has consent for patient
          const allowed = await can(
            { userId: req.user.userId, role: req.user.role },
            'record:read',
            { recordPatientId: patientId }
          );
          if (!allowed) {
            throw new AppError('Access Denied: No active consent for this patient', 403);
          }
          filter = { patientId };
        }
      }

      const prescriptions = await Prescription.find(filter)
        .populate('doctorId', 'firstName lastName email licenseNumber')
        .populate('patientId', 'firstName lastName email')
        .sort({ createdAt: -1 });

      res.status(200).json({
        status: 'SUCCESS',
        prescriptions,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async requestRefill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const prescription = await Prescription.findById(id);
      if (!prescription) {
        throw new AppError('Prescription not found', 404);
      }

      if (
        prescription.patientId.toString() !== req.user.userId &&
        prescription.doctorId.toString() !== req.user.userId
      ) {
        throw new AppError('Unauthorized access to prescription refill', 403);
      }

      // Notify the other party
      const notifyTarget =
        req.user.role === 'PATIENT'
          ? prescription.doctorId.toString()
          : prescription.patientId.toString();

      await NotificationService.notify({
        userId: notifyTarget,
        type: 'PRESCRIPTION_REFILL_REQUESTED',
        title: 'Prescription Refill Update',
        message:
          req.user.role === 'PATIENT'
            ? 'Patient has requested a refill for their active prescription.'
            : 'Physician has authorized a refill for your prescription.',
        metadata: { prescriptionId: prescription._id.toString() },
      });

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_UPDATE',
        targetId: prescription._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { action: 'REFILL_REQUESTED' },
      });

      res.status(200).json({
        status: 'SUCCESS',
        message: 'Refill request processed successfully',
        prescriptionId: prescription._id,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async checkInteractions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = checkInteractionsSchema.parse(req.body);

      let medsToCheck: string[] = validated.medications || [];

      // If no meds passed and patient calling, pull their active prescriptions
      if (medsToCheck.length === 0 && req.user.role === 'PATIENT') {
        const userPrescriptions = await Prescription.find({ patientId: req.user.userId });
        for (const rx of userPrescriptions) {
          for (const m of rx.medications) {
            medsToCheck.push(m.name);
          }
        }
      }

      const interactions = evaluateInteractions(medsToCheck);

      res.status(200).json({
        status: 'SUCCESS',
        checkedMedications: medsToCheck,
        interactionsCount: interactions.length,
        interactions,
        hasInteractions: interactions.length > 0,
        disclaimer:
          'Informational interaction screening tool only. Not diagnostic or prescribing advice. MediChain-AI does not provide medical recommendations. Always consult a licensed healthcare practitioner or pharmacist.',
      });
    } catch (err) {
      next(err);
    }
  }
}
