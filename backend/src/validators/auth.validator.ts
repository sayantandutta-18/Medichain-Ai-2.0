import { z } from 'zod';

export const COMMON_PASSWORDS = [
  'password1234',
  '123456789012',
  'qwertyuiopas',
  'admin1234567',
  'password12345',
  'welcome12345',
  'changeme1234',
  'administrator',
  'medichain123',
  'testpassword1',
];

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(12, 'Password must be at least 12 characters long')
    .refine((p) => !COMMON_PASSWORDS.includes(p.toLowerCase()), {
      message: 'Password is in common passwords list; choose a stronger password',
    }),
  role: z.enum(['PATIENT', 'DOCTOR'], {
    errorMap: () => ({ message: 'Role must be either PATIENT or DOCTOR (ADMIN cannot be registered via API)' }),
  }),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((e) => e.toLowerCase().trim()),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
