import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import { NotificationService } from '../services/notification.service.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const createAppointmentSchema = z.object({
  doctorId: z.string().optional(),
  patientId: z.string().optional(),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  reason: z.string().max(300).optional(),
});

export class AppointmentController {
  public static async getAvailableDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const doctors = await User.find({
        role: 'DOCTOR',
        verificationStatus: 'VERIFIED',
      }).select('firstName lastName email licenseNumber');

      res.status(200).json({
        status: 'SUCCESS',
        doctors,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async schedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = createAppointmentSchema.parse(req.body);

      let patientId = req.user.role === 'PATIENT' ? req.user.userId : validated.patientId;
      let doctorId = req.user.role === 'DOCTOR' ? req.user.userId : validated.doctorId;

      if (!patientId || !doctorId) {
        throw new AppError('Both patientId and doctorId are required to book a consultation', 400);
      }

      if (patientId === doctorId) {
        throw new AppError('Patient and doctor cannot be the same user', 400);
      }

      const slotStart = new Date(validated.slotStart);
      const slotEnd = new Date(validated.slotEnd);

      if (slotEnd <= slotStart) {
        throw new AppError('slotEnd must be after slotStart', 400);
      }

      // Check doctor availability (prevent double-booking)
      const existing = await Appointment.findOne({
        doctorId,
        slotStart,
        status: 'SCHEDULED',
      });

      if (existing) {
        throw new AppError('The requested consultation time slot is already booked for this doctor', 409);
      }

      const appointment = await Appointment.create({
        patientId,
        doctorId,
        slotStart,
        slotEnd,
        status: 'SCHEDULED',
        reason: validated.reason,
        schemaVersion: 1,
      });

      const recipient = req.user.role === 'PATIENT' ? doctorId : patientId;
      await NotificationService.notify({
        userId: recipient,
        type: 'APPOINTMENT_SCHEDULED',
        title: 'New Telehealth Consultation Scheduled',
        message: `A telehealth appointment has been scheduled for ${slotStart.toLocaleString()}.`,
        metadata: { appointmentId: appointment._id.toString() },
      });

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'APPOINTMENT_SCHEDULED',
        targetId: appointment._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: { doctorId, patientId, slotStart: slotStart.toISOString() },
      });

      res.status(201).json({
        status: 'SUCCESS',
        appointment,
        telehealthRoomId: `medichain-telehealth-${appointment._id}`,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        return next(new AppError('The requested consultation time slot is already booked', 409));
      }
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const userId = req.user.userId;
      const filter = {
        $or: [{ patientId: userId }, { doctorId: userId }],
      };

      const appointments = await Appointment.find(filter)
        .populate('doctorId', 'firstName lastName email licenseNumber')
        .populate('patientId', 'firstName lastName email')
        .sort({ slotStart: 1 });

      const enriched = appointments.map((apt) => ({
        ...apt.toObject(),
        telehealthRoomId: `medichain-telehealth-${apt._id}`,
      }));

      res.status(200).json({
        status: 'SUCCESS',
        appointments: enriched,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new AppError('Appointment not found', 404);
      }

      if (
        appointment.patientId.toString() !== req.user.userId &&
        appointment.doctorId.toString() !== req.user.userId
      ) {
        throw new AppError('Unauthorized to modify this appointment', 403);
      }

      appointment.status = 'CANCELLED';
      await appointment.save();

      const recipient =
        req.user.userId === appointment.patientId.toString()
          ? appointment.doctorId.toString()
          : appointment.patientId.toString();

      await NotificationService.notify({
        userId: recipient,
        type: 'APPOINTMENT_CANCELLED',
        title: 'Consultation Cancelled',
        message: 'The scheduled telehealth consultation has been cancelled.',
        metadata: { appointmentId: appointment._id.toString() },
      });

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'APPOINTMENT_CANCELLED',
        targetId: appointment._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
      });

      res.status(200).json({
        status: 'SUCCESS',
        message: 'Appointment cancelled successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getTelehealthRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new AppError('Appointment not found', 404);
      }

      if (
        appointment.patientId.toString() !== req.user.userId &&
        appointment.doctorId.toString() !== req.user.userId
      ) {
        throw new AppError('Unauthorized to join this telehealth room', 403);
      }

      if (appointment.status === 'CANCELLED') {
        throw new AppError('Cannot join cancelled appointment', 400);
      }

      const roomId = `medichain-telehealth-${appointment._id}`;
      const sessionToken = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'secret')
        .update(`${roomId}:${req.user.userId}:${Date.now()}`)
        .digest('hex');

      res.status(200).json({
        status: 'SUCCESS',
        roomId,
        appointmentId: appointment._id,
        slotStart: appointment.slotStart,
        slotEnd: appointment.slotEnd,
        peerRole: req.user.role,
        encryption: 'E2EE-WebRTC-AES-GCM',
        sessionToken,
      });
    } catch (err) {
      next(err);
    }
  }
}
