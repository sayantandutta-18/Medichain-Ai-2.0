import { describe, it, expect } from 'vitest';
import { parseEnv } from '../src/config/env.js';

describe('Environment Variable Validation', () => {
  const validBaseEnv = {
    PORT: '4000',
    CORS_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
  };

  it('succeeds when all required variables are valid', () => {
    const parsed = parseEnv(validBaseEnv);
    expect(parsed.PORT).toBe(4000);
    expect(parsed.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.MAX_UPLOAD_MB).toBe(10);
  });

  it('fails fast with a clear message when PORT is missing', () => {
    const invalidEnv = { ...validBaseEnv };
    delete (invalidEnv as any).PORT;

    expect(() => parseEnv(invalidEnv)).toThrowError(/PORT is required/);
  });

  it('fails fast with a clear message when PORT is non-numeric or out of range', () => {
    expect(() => parseEnv({ ...validBaseEnv, PORT: 'abc' })).toThrowError(/PORT must be an integer/);
    expect(() => parseEnv({ ...validBaseEnv, PORT: '0' })).toThrowError(/PORT must be an integer/);
    expect(() => parseEnv({ ...validBaseEnv, PORT: '999999' })).toThrowError(/PORT must be an integer/);
  });

  it('fails fast when NODE_ENV is an invalid enum value', () => {
    expect(() => parseEnv({ ...validBaseEnv, NODE_ENV: 'invalid_env' as any })).toThrowError(
      /NODE_ENV/
    );
  });
});
