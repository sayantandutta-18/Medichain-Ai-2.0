import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhookSubscription {
  userId: Types.ObjectId;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  lastDeliveredAt?: Date;
  schemaVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebhookSubscriptionDocument extends IWebhookSubscription, Document<Types.ObjectId> {}

const webhookSubscriptionSchema = new Schema<WebhookSubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      required: true,
      default: ['RECORD_CREATED', 'CONSENT_APPROVED', 'PRESCRIPTION_ISSUED'],
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastDeliveredAt: {
      type: Date,
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

webhookSubscriptionSchema.index({ userId: 1, active: 1 });

export const WebhookSubscription = model<WebhookSubscriptionDocument>(
  'WebhookSubscription',
  webhookSubscriptionSchema
);
