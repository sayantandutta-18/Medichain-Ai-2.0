import { z } from 'zod';

export const createAccessRequestSchema = z.object({
  patientId: z.string({ required_error: 'patientId is required' }).min(1),
  purpose: z.string({ required_error: 'purpose is required' }).min(3, 'Purpose must be at least 3 characters'),
});

export const approveAccessRequestSchema = z.object({
  scope: z.enum(['VIEW', 'DOWNLOAD', 'FULL']).default('VIEW'),
  expiresAt: z.coerce.date().refine((d) => d > new Date(), {
    message: 'expiresAt must be a future date',
  }),
});

export type CreateAccessRequestInput = z.infer<typeof createAccessRequestSchema>;
export type ApproveAccessRequestInput = z.infer<typeof approveAccessRequestSchema>;
