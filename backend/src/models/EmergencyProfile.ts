import { Schema, model, Document, Types } from 'mongoose';

export interface IEmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface IEmergencyProfile {
  patientId: Types.ObjectId;
  bloodGroup?: string;
  allergies: string[];
  emergencyContacts: IEmergencyContact[];
  conditionsSummary?: string;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmergencyProfileDocument extends IEmergencyProfile, Document<Types.ObjectId> {}

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true },
    relation: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const emergencyProfileSchema = new Schema<EmergencyProfileDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    allergies: {
      type: [String],
      default: [],
    },
    emergencyContacts: {
      type: [emergencyContactSchema],
      default: [],
    },
    conditionsSummary: {
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

export const EmergencyProfile = model<EmergencyProfileDocument>(
  'EmergencyProfile',
  emergencyProfileSchema
);
