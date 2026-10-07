import { z } from 'zod';

export const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  title: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  patientId: z.string().optional(),
});

export const updateRecordMetadataSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').trim().optional(),
  type: z.string().min(1).trim().optional(),
});

export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
export type UpdateRecordMetadataInput = z.infer<typeof updateRecordMetadataSchema>;
