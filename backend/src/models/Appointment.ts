import { Schema, model, Document, Types } from 'mongoose';

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface IAppointment {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  slotStart: Date;
  slotEnd: Date;
  status: AppointmentStatus;
  reason?: string;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppointmentDocument extends IAppointment, Document<Types.ObjectId> {}

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    slotStart: {
      type: Date,
      required: true,
    },
    slotEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      required: true,
    },
    reason: {
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

// Unique compound index preventing double-booking of doctor slots
appointmentSchema.index({ doctorId: 1, slotStart: 1 }, { unique: true });

export const Appointment = model<AppointmentDocument>('Appointment', appointmentSchema);
