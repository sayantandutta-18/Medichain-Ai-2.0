import { Schema, model, Document, Types } from 'mongoose';
import { MetricType } from './HealthMetric.js';

export type GoalStatus = 'IN_PROGRESS' | 'ACHIEVED' | 'MISSED';

export interface IHealthGoal {
  patientId: Types.ObjectId;
  metricType: MetricType;
  targetValue: number;
  initialValue?: number;
  unit: string;
  startDate: Date;
  targetDate: Date;
  status: GoalStatus;
  notes?: string;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HealthGoalDocument extends IHealthGoal, Document<Types.ObjectId> {}

const healthGoalSchema = new Schema<HealthGoalDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    metricType: {
      type: String,
      enum: ['BLOOD_PRESSURE', 'HEART_RATE', 'GLUCOSE', 'CHOLESTEROL', 'WEIGHT', 'TEMPERATURE'],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    initialValue: {
      type: Number,
    },
    unit: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'ACHIEVED', 'MISSED'],
      default: 'IN_PROGRESS',
    },
    notes: {
      type: String,
      maxlength: 300,
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

healthGoalSchema.index({ patientId: 1, status: 1 });

export const HealthGoal = model<HealthGoalDocument>('HealthGoal', healthGoalSchema);
