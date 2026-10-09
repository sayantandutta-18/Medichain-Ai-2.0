import { Request, Response, NextFunction } from 'express';
import { HealthMetric, MetricType } from '../models/HealthMetric.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const VALID_UNITS_BY_TYPE: Record<MetricType, string[]> = {
  BLOOD_PRESSURE: ['mmHg'],
  HEART_RATE: ['bpm'],
  GLUCOSE: ['mg/dL', 'mmol/L'],
  CHOLESTEROL: ['mg/dL', 'mmol/L'],
  WEIGHT: ['kg', 'lbs'],
  TEMPERATURE: ['°C', '°F'],
};

const createHealthMetricSchema = z
  .object({
    metricType: z.enum(['BLOOD_PRESSURE', 'HEART_RATE', 'GLUCOSE', 'CHOLESTEROL', 'WEIGHT', 'TEMPERATURE']).optional(),
    type: z.enum(['BLOOD_PRESSURE', 'HEART_RATE', 'GLUCOSE', 'CHOLESTEROL', 'WEIGHT', 'TEMPERATURE']).optional(),
    value: z.number().positive(),
    secondaryValue: z.number().positive().optional(),
    unit: z.string().min(1),
    recordedAt: z.string().datetime().optional(),
    notes: z.string().max(300).optional(),
  })
  .refine(
    (data) => {
      const type = (data.metricType || data.type) as MetricType | undefined;
      if (!type) return false;
      const allowedUnits = VALID_UNITS_BY_TYPE[type];
      return allowedUnits && allowedUnits.includes(data.unit);
    },
    {
      message: 'Invalid unit for selected health metric type',
      path: ['unit'],
    }
  )
  .transform((data) => ({
    metricType: (data.metricType || data.type) as MetricType,
    value: data.value,
    secondaryValue: data.secondaryValue,
    unit: data.unit,
    recordedAt: data.recordedAt,
    notes: data.notes,
  }));

export class AnalyticsController {
  public static async logMetric(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const validated = createHealthMetricSchema.parse(req.body);

      const metric = await HealthMetric.create({
        patientId: req.user.userId,
        metricType: validated.metricType,
        value: validated.value,
        secondaryValue: validated.secondaryValue,
        unit: validated.unit,
        recordedAt: validated.recordedAt ? new Date(validated.recordedAt) : new Date(),
        notes: validated.notes,
        schemaVersion: 1,
      });

      res.status(201).json({ metric });
    } catch (err) {
      next(err);
    }
  }

  public static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { type } = req.query;
      const filter: any = { patientId: req.user.userId };
      if (type && typeof type === 'string') {
        filter.metricType = type;
      }

      const rawMetrics = await HealthMetric.find(filter).sort({ recordedAt: 1 }).limit(100);

      // Derive truthful summary statistics ONLY from actual entered data
      const statsByType: Record<string, any> = {};

      for (const m of rawMetrics) {
        if (!statsByType[m.metricType]) {
          statsByType[m.metricType] = {
            count: 0,
            unit: m.unit,
            min: m.value,
            max: m.value,
            sum: 0,
            latest: {
              value: m.value,
              secondaryValue: m.secondaryValue,
              unit: m.unit,
              recordedAt: m.recordedAt,
            },
          };
        }
        const s = statsByType[m.metricType];
        s.count += 1;
        s.sum += m.value;
        if (m.value < s.min) s.min = m.value;
        if (m.value > s.max) s.max = m.value;
        s.latest = {
          value: m.value,
          secondaryValue: m.secondaryValue,
          unit: m.unit,
          recordedAt: m.recordedAt,
        };
      }

      const summaryObj: Record<string, any> = {};
      const summaryList: any[] = [];

      for (const [k, v] of Object.entries(statsByType)) {
        const item = {
          type: k,
          metricType: k,
          count: v.count,
          unit: v.unit,
          min: v.min,
          max: v.max,
          average: Math.round((v.sum / v.count) * 10) / 10,
          avg: Math.round((v.sum / v.count) * 10) / 10,
          latest: v.latest,
        };
        summaryObj[k] = item;
        summaryList.push(item);
      }

      res.status(200).json({
        metrics: summaryList,
        logs: rawMetrics,
        summary: summaryObj,
      });
    } catch (err) {
      next(err);
    }
  }
}
