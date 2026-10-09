import { Request, Response, NextFunction } from 'express';
import { EmergencyProfile } from '../models/EmergencyProfile.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const emergencyContactSchema = z
  .object({
    name: z.string().min(1).max(100),
    relation: z.string().max(50).optional(),
    relationship: z.string().max(50).optional(),
    phone: z.string().max(30).optional(),
    phoneNumber: z.string().max(30).optional(),
  })
  .transform((c) => ({
    name: c.name,
    relationship: c.relationship || c.relation || 'Emergency Contact',
    relation: c.relation || c.relationship || 'Emergency Contact',
    phoneNumber: c.phoneNumber || c.phone || '',
    phone: c.phone || c.phoneNumber || '',
  }));

const updateEmergencyProfileSchema = z.object({
  bloodGroup: z.string().max(10).optional(),
  allergies: z.array(z.string().max(100)).optional(),
  emergencyContacts: z.array(emergencyContactSchema).optional(),
  conditionsSummary: z.string().max(500).optional(),
});

import { generateQrSvg } from '../utils/qr.js';

export class EmergencyController {
  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      let profile = await EmergencyProfile.findOne({ patientId: req.user.userId });
      if (!profile) {
        profile = await EmergencyProfile.create({
          patientId: req.user.userId,
          allergies: [],
          emergencyContacts: [],
          schemaVersion: 1,
        });
      }

      res.status(200).json({
        profile,
        card: profile,
        emergencyToken: req.user.userId,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = updateEmergencyProfileSchema.parse(req.body);

      const profile = await EmergencyProfile.findOneAndUpdate(
        { patientId: req.user.userId },
        { ...validated },
        { new: true, upsert: true }
      );

      res.status(200).json({
        profile,
        card: profile,
        emergencyToken: req.user.userId,
      });
    } catch (err) {
      next(err);
    }
  }

  // Public/First-responder emergency endpoint: Strictly allow-listed fields only
  public static async getPublicEmergencyCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier = req.params.patientId || req.params.token;

      const [patient, profile] = await Promise.all([
        User.findById(identifier).select('firstName lastName'),
        EmergencyProfile.findOne({ patientId: identifier }),
      ]);

      if (!patient) {
        throw new AppError('Emergency record not found', 404);
      }

      // Minimal field allow-list: Never expose medical records or ciphertexts
      const allowListedEmergencyData = {
        patientName: patient.firstName
          ? `${patient.firstName} ${patient.lastName || ''}`.trim()
          : 'Emergency Patient',
        bloodGroup: profile?.bloodGroup || 'Not Specified',
        allergies: profile?.allergies || [],
        emergencyContacts: profile?.emergencyContacts || [],
        conditionsSummary: profile?.conditionsSummary || 'None specified',
        isEmergencyAllowListOnly: true,
      };

      res.status(200).json({
        emergencyCard: allowListedEmergencyData,
        data: allowListedEmergencyData,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getEmergencyQrCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier = req.params.patientId || req.params.token || req.user?.userId;
      if (!identifier) {
        throw new AppError('Emergency identifier required', 400);
      }

      const emergencyUrl = `/emergency/${identifier}`;
      const svg = generateQrSvg(emergencyUrl, 300);
      const asDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

      res.status(200).json({
        status: 'SUCCESS',
        identifier,
        emergencyUrl,
        svg,
        dataUrl: asDataUrl,
      });
    } catch (err) {
      next(err);
    }
  }
}
