import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, CryptoService } from '../src/utils/crypto.js';
import { sha256 } from '../src/utils/hash.js';
import { IntegrityService } from '../src/services/integrity.js';

describe('Cryptographic Operations & Integrity Verification (Checkpoint 6)', () => {
  const sampleData = Buffer.from('Confidential Patient Medical Report Plaintext Content');
  const aad = 'record-uuid-12345|patient-uuid-67890';

  it('performs clean round-trip encryption and decryption returning original bytes', () => {
    const encrypted = encrypt(sampleData, aad);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.keyVersion).toBe(1);

    const decrypted = decrypt(encrypted, aad);
    expect(decrypted.toString()).toBe(sampleData.toString());
  });

  it('two encryptions of the same bytes produce different ciphertexts (random IV per call)', () => {
    const enc1 = encrypt(sampleData, aad);
    const enc2 = encrypt(sampleData, aad);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('throws an error when ciphertext is tampered', () => {
    const encrypted = encrypt(sampleData, aad);
    const rawCipher = Buffer.from(encrypted.ciphertext, 'base64');
    rawCipher[0] ^= 0xff; // Flip bits
    const tamperedPayload = { ...encrypted, ciphertext: rawCipher.toString('base64') };

    expect(() => decrypt(tamperedPayload, aad)).toThrowError(/tampering detected/i);
  });

  it('throws an error when auth tag is tampered', () => {
    const encrypted = encrypt(sampleData, aad);
    const rawTag = Buffer.from(encrypted.authTag, 'base64');
    rawTag[0] ^= 0xff; // Flip bits
    const tamperedPayload = { ...encrypted, authTag: rawTag.toString('base64') };

    expect(() => decrypt(tamperedPayload, aad)).toThrowError(/tampering detected/i);
  });

  it('throws an error when AAD does not match original binding (context relocation defense)', () => {
    const encrypted = encrypt(sampleData, aad);
    const wrongAad = 'different-record-id|different-patient-id';

    expect(() => decrypt(encrypted, wrongAad)).toThrowError(/tampering detected/i);
  });

  it('computes deterministic SHA-256 hashes across repeated calls', () => {
    const hash1 = sha256(sampleData);
    const hash2 = sha256(sampleData);
    const hash3 = sha256(Buffer.from('Different data'));

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64);
  });

  it('evaluates integrity statuses with exact strings from specification', () => {
    const originalHash = sha256(sampleData);
    const modifiedHash = sha256(Buffer.from('Altered document bytes'));

    // 1. Strict match -> VERIFIED
    expect(IntegrityService.evaluateIntegrity(originalHash, originalHash, true)).toBe('VERIFIED');

    // 2. Hash difference -> MISMATCH
    expect(IntegrityService.evaluateIntegrity(originalHash, modifiedHash, true)).toBe('MISMATCH');

    // 3. No on-chain anchor -> NOT_ANCHORED
    expect(IntegrityService.evaluateIntegrity(originalHash, null, true)).toBe('NOT_ANCHORED');
    expect(IntegrityService.evaluateIntegrity(originalHash, undefined, true)).toBe('NOT_ANCHORED');

    // 4. Network or config missing -> UNAVAILABLE
    expect(IntegrityService.evaluateIntegrity(originalHash, originalHash, false)).toBe('UNAVAILABLE');
  });
});
