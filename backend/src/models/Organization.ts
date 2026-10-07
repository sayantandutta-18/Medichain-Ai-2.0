import { Schema, model, Document, Types } from 'mongoose';

export interface IOrganization {
  name: string;
  code: string;
  type: string;
  verified: boolean;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrganizationDocument extends IOrganization, Document<Types.ObjectId> {}

const organizationSchema = new Schema<OrganizationDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      default: 'HOSPITAL',
    },
    verified: {
      type: Boolean,
      default: false,
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

export const Organization = model<OrganizationDocument>('Organization', organizationSchema);
