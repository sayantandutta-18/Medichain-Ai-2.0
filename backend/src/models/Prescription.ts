import { Schema, model, Document, Types } from 'mongoose';

export interface IMedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface IPrescription {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  recordId?: Types.ObjectId;
  medications: IMedicationItem[];
  notes?: string;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PrescriptionDocument extends IPrescription, Document<Types.ObjectId> {}

const medicationItemSchema = new Schema<IMedicationItem>(
  {
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String },
  },
  { _id: false }
);

const prescriptionSchema = new Schema<PrescriptionDocument>(
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
    recordId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicalRecord',
    },
    medications: {
      type: [medicationItemSchema],
      default: [],
    },
    notes: {
      type: String,
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

export const Prescription = model<PrescriptionDocument>('Prescription', prescriptionSchema);
