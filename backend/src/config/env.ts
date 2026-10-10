import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env if present
dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string({ required_error: 'PORT is required' })
    .min(1, 'PORT is required')
    .refine(
      (val) => {
        const num = Number(val);
        return Number.isInteger(num) && num > 0 && num <= 65535;
      },
      { message: 'PORT must be an integer between 1 and 65535' }
    )
    .transform((val) => Number(val)),
  CORS_ORIGIN: z.string({ required_error: 'CORS_ORIGIN is required' }).min(1, 'CORS_ORIGIN is required').default('http://localhost:5173,https://medichain-ai-2-0-7sbp.vercel.app'),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  ENCRYPTION_KEY: z.string().optional(),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  SUI_MODE: z.enum(['testnet', 'simulated', 'disabled']).default('simulated'),
  SUI_NETWORK: z.string().default('testnet'),
  SUI_RPC_URL: z.string().default('https://graphql.testnet.sui.io/graphql'),
  SUI_PACKAGE_ID: z.string().default('0x57c69fd3f040fa1a2746ff5ce45ff8644ef728d5737e76a725719f7492006526'),
  SUI_REGISTRY_ID: z.string().optional(),
  SUI_ENV_MNEMONIC: z.string().optional(),
  SUI_PRIVATE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `${e.path.join('.') || 'variable'}: ${e.message}`)
      .join('; ');
    throw new Error(`Environment configuration error: ${errorDetails}`);
  }
  return result.data;
}

// In test environment, provide fallback PORT if not explicitly provided so importing app in tests does not fail
if (process.env.NODE_ENV === 'test' && !process.env.PORT) {
  process.env.PORT = '4000';
}

export const env = parseEnv(process.env);
