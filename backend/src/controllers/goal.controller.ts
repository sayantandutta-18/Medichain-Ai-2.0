import { Request, Response, NextFunction } from 'express';
import { HealthGoal, GoalStatus } from '../models/HealthGoal.js';
import { HealthMetric, MetricType } from '../models/HealthMetric.js';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const createGoalSchema = z.object({
  metricType: z.enum(['BLOOD_PRESSURE', 'HEART_RATE', 'GLUCOSE', 'CHOLESTEROL', 'WEIGHT', 'TEMPERATURE']),
  targetValue: z.number().positive(),
  initialValue: z.number().positive().optional(),
  unit: z.string().min(1),
  targetDate: z.string().datetime(),
  notes: z.string().max(300).optional(),
});

const updateGoalSchema = z.object({
  targetValue: z.number().positive().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.enum(['IN_PROGRESS', 'ACHIEVED', 'MISSED']).optional(),
  notes: z.string().max(300).optional(),
});

export class GoalController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      if (req.user.role !== 'PATIENT') {
        throw new AppError('Only patients can set health goals for their profile', 403);
      }

      const validated = createGoalSchema.parse(req.body);

      // Auto-detect initial value from most recent HealthMetric if not provided
      let initialValue = validated.initialValue;
      if (!initialValue) {
        const latestMetric = await HealthMetric.findOne({
          patientId: req.user.userId,
          metricType: validated.metricType,
        }).sort({ recordedAt: -1 });

        if (latestMetric) {
          initialValue = latestMetric.value;
        } else {
          initialValue = validated.targetValue;
        }
      }

      const goal = await HealthGoal.create({
        patientId: req.user.userId,
        metricType: validated.metricType,
        targetValue: validated.targetValue,
        initialValue,
        unit: validated.unit,
        startDate: new Date(),
        targetDate: new Date(validated.targetDate),
        status: 'IN_PROGRESS',
        notes: validated.notes,
        schemaVersion: 1,
      });

      await AuditService.record({
        actorId: req.user.userId,
        role: req.user.role,
        action: 'RECORD_CREATE',
        targetId: goal._id.toString(),
        requestId: req.requestId || 'unknown',
        ip: req.ip,
        metadata: {
          metricType: validated.metricType,
          targetValue: validated.targetValue,
        },
      });

      res.status(201).json({
        status: 'SUCCESS',
        goal,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const goals = await HealthGoal.find({ patientId: req.user.userId }).sort({ createdAt: -1 });

      res.status(200).json({
        status: 'SUCCESS',
        goals,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const userId = req.user.userId;
      const goals = await HealthGoal.find({ patientId: userId }).sort({ createdAt: -1 });

      const progressList = await Promise.all(
        goals.map(async (goal) => {
          const latestMetric = await HealthMetric.findOne({
            patientId: userId,
            metricType: goal.metricType,
          }).sort({ recordedAt: -1 });

          const currentValue = latestMetric ? latestMetric.value : goal.initialValue ?? goal.targetValue;
          const initial = goal.initialValue ?? currentValue;
          const target = goal.targetValue;

          let progressPct = 0;
          if (target === initial) {
            progressPct = currentValue === target ? 100 : 0;
          } else {
            const rawProgress = ((currentValue - initial) / (target - initial)) * 100;
            progressPct = Math.max(0, Math.min(100, Math.round(rawProgress)));
          }

          const now = Date.now();
          const targetTime = new Date(goal.targetDate).getTime();
          const daysRemaining = Math.max(0, Math.ceil((targetTime - now) / (1000 * 60 * 60 * 24)));

          let computedStatus: GoalStatus = goal.status;
          if (progressPct >= 100) {
            computedStatus = 'ACHIEVED';
          } else if (daysRemaining === 0 && now > targetTime && goal.status === 'IN_PROGRESS') {
            computedStatus = 'MISSED';
          }

          return {
            id: goal._id,
            metricType: goal.metricType,
            initialValue: initial,
            currentValue,
            targetValue: target,
            unit: goal.unit,
            progressPct,
            startDate: goal.startDate,
            targetDate: goal.targetDate,
            daysRemaining,
            status: computedStatus,
            notes: goal.notes,
          };
        })
      );

      res.status(200).json({
        status: 'SUCCESS',
        progress: progressList,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validated = updateGoalSchema.parse(req.body);

      const goal = await HealthGoal.findOne({ _id: id, patientId: req.user.userId });
      if (!goal) {
        throw new AppError('Health goal not found', 404);
      }

      if (validated.targetValue !== undefined) goal.targetValue = validated.targetValue;
      if (validated.targetDate !== undefined) goal.targetDate = new Date(validated.targetDate);
      if (validated.status !== undefined) goal.status = validated.status;
      if (validated.notes !== undefined) goal.notes = validated.notes;

      await goal.save();

      res.status(200).json({
        status: 'SUCCESS',
        goal,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const deleted = await HealthGoal.findOneAndDelete({ _id: id, patientId: req.user.userId });

      if (!deleted) {
        throw new AppError('Health goal not found', 404);
      }

      res.status(200).json({
        status: 'SUCCESS',
        message: 'Goal removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
