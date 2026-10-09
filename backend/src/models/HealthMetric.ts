import { Schema, model, Document, Types } from 'mongoose';

export type MetricType =
  | 'BLOOD_PRESSURE'
  | 'HEART_RATE'
  | 'GLUCOSE'
  | 'CHOLESTEROL'
  | 'WEIGHT'
  | 'TEMPERATURE';

export interface IHealthMetric {
  patientId: Types.ObjectId;
  metricType: MetricType;
  value: number;
  secondaryValue?: number;
  unit: string;
  recordedAt: Date;
  notes?: string;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HealthMetricDocument extends IHealthMetric, Document<Types.ObjectId> {}

const healthMetricSchema = new Schema<HealthMetricDocument>(
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
      index: true,
    },
    value: {
      type: Number,
      required: true,
    },
    secondaryValue: {
      type: Number,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    recordedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
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

healthMetricSchema.index({ patientId: 1, metricType: 1, recordedAt: -1 });

export const HealthMetric = model<HealthMetricDocument>('HealthMetric', healthMetricSchema);
