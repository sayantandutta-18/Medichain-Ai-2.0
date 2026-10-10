import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { SuiClient } from '../src/blockchain/suiClient.js';
import { AuthService } from '../src/services/auth.service.js';
import { MedicalRecord } from '../src/models/MedicalRecord.js';
import { encrypt } from '../src/utils/crypto.js';
import { sha256 } from '../src/utils/hash.js';

describe('Sui Blockchain Anchoring & Verification (Checkpoint 8)', () => {
  let mongoServer: MongoMemoryServer;
  let patientToken = '';
  let patientId = '';
  let sampleRecordId = '';
  const testBytes = Buffer.from('Blood Chemistry Test Results - Verified');
  const computedSha256 = sha256(testBytes);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const pat = await AuthService.register({
      email: 'sui.patient@test.dev',
      password: 'StrongPassword123!',
      role: 'PATIENT',
      firstName: 'SuiPatient',
    });
    patientToken = pat.tokens.accessToken;
    patientId = pat.user.id;

    // Create a record directly in DB
    const recordId = new mongoose.Types.ObjectId();
    const encrypted = encrypt(testBytes, `${recordId.toString()}|${patientId}`);

    const record = await MedicalRecord.create({
      _id: recordId,
      patientId: new mongoose.Types.ObjectId(patientId),
      title: 'Lab Report for Blockchain Anchor',
      type: 'LAB_REPORT',
      status: 'PENDING_ANCHOR',
      encryptedPayload: encrypted,
      sha256: computedSha256,
      keyVersion: 1,
      schemaVersion: 1,
    });
    sampleRecordId = record._id.toString();
  }, 300000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('Simulated Mode (Default)', () => {
    it('anchors record storing txDigest and objectId with truthful simulated mode label', async () => {
      const prevMode = process.env.SUI_MODE;
      process.env.SUI_MODE = 'simulated';

      const res = await request(app)
        .post(`/api/v1/records/${sampleRecordId}/anchor`)
        .set('Authorization', `Bearer ${patientToken}`);

      process.env.SUI_MODE = prevMode;

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CONFIRMED');
      expect(res.body.mode).toBe('simulated');
      expect(res.body.txDigest).toContain('SIMULATED_TX_');
      expect(res.body.objectId).toContain('0xsimulated');
      expect(res.body.message).toContain('SIMULATED mode');

      // Verify DB record updated
      const updated = await MedicalRecord.findById(sampleRecordId);
      expect(updated?.blockchainAnchor?.status).toBe('CONFIRMED');
      expect(updated?.blockchainAnchor?.txDigest).toBe(res.body.txDigest);
    });

    it('returns VERIFIED status on actual hash match with truthful mode label', async () => {
      const prevMode = process.env.SUI_MODE;
      process.env.SUI_MODE = 'simulated';

      const res = await request(app)
        .get(`/api/v1/records/${sampleRecordId}/verify`)
        .set('Authorization', `Bearer ${patientToken}`);

      process.env.SUI_MODE = prevMode;

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('VERIFIED');
      expect(res.body.mode).toBe('simulated');
      expect(res.body.computedHash).toBe(computedSha256);
      expect(res.body.onChainHash).toBe(computedSha256);
      expect(res.body.message).toContain('SIMULATED mode');
    });

    it('returns MISMATCH status when on-chain hash does not match computed hash', async () => {
      // Intentionally alter onChainHash in DB to simulate document or anchor tampering
      await MedicalRecord.findByIdAndUpdate(sampleRecordId, {
        'blockchainAnchor.onChainHash': '0000000000000000000000000000000000000000000000000000000000000000',
      });

      const res = await request(app)
        .get(`/api/v1/records/${sampleRecordId}/verify`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('MISMATCH');
      expect(res.body.message).toContain('Integrity violation');

      // Restore valid onChainHash
      await MedicalRecord.findByIdAndUpdate(sampleRecordId, {
        'blockchainAnchor.onChainHash': computedSha256,
      });
    });

    it('returns NOT_ANCHORED status when record has never been anchored', async () => {
      const unanchoredId = new mongoose.Types.ObjectId();
      await MedicalRecord.create({
        _id: unanchoredId,
        patientId: new mongoose.Types.ObjectId(patientId),
        title: 'Unanchored Record',
        type: 'LAB_REPORT',
        status: 'PENDING_ANCHOR',
        encryptedPayload: encrypt(testBytes, `${unanchoredId.toString()}|${patientId}`),
        sha256: computedSha256,
        keyVersion: 1,
        schemaVersion: 1,
      });

      const res = await request(app)
        .get(`/api/v1/records/${unanchoredId}/verify`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('NOT_ANCHORED');
      expect(res.body.message).toContain('not been anchored');
    });
  });

  describe('Disabled Mode', () => {
    it('returns truthful disabled / UNAVAILABLE responses when SUI_MODE=disabled', async () => {
      const prevMode = process.env.SUI_MODE;
      process.env.SUI_MODE = 'disabled';

      const verifyRes = await request(app)
        .get(`/api/v1/records/${sampleRecordId}/verify`)
        .set('Authorization', `Bearer ${patientToken}`);

      const anchorRes = await request(app)
        .post(`/api/v1/records/${sampleRecordId}/anchor`)
        .set('Authorization', `Bearer ${patientToken}`);

      process.env.SUI_MODE = prevMode;

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.status).toBe('UNAVAILABLE');
      expect(verifyRes.body.mode).toBe('disabled');

      expect(anchorRes.status).toBe(200);
      expect(anchorRes.body.status).toBe('DISABLED');
      expect(anchorRes.body.mode).toBe('disabled');
    });
  });

  describe('Mnemonic & Secret Hygiene', () => {
    it('guarantees mnemonic or private keys never leak in API responses (Master Rule 9)', async () => {
      const res = await request(app)
        .post(`/api/v1/records/${sampleRecordId}/anchor`)
        .set('Authorization', `Bearer ${patientToken}`);

      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toContain('mnemonic');
      expect(responseString).not.toContain('SUI_ENV_MNEMONIC');
      expect(responseString).not.toContain('abandon');
    });
  });

  describe('Testnet Mode Configuration & Truthful Failures', () => {
    it('returns honest FAILED status when testnet mode is requested but credentials are missing or placeholder', async () => {
      const prevMode = process.env.SUI_MODE;
      const prevMnemonic = process.env.SUI_ENV_MNEMONIC;
      process.env.SUI_MODE = 'testnet';
      process.env.SUI_ENV_MNEMONIC = ''; // Empty signing credentials

      const res = await request(app)
        .post(`/api/v1/records/${sampleRecordId}/anchor`)
        .set('Authorization', `Bearer ${patientToken}`);

      process.env.SUI_MODE = prevMode;
      process.env.SUI_ENV_MNEMONIC = prevMnemonic;

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('FAILED');
      expect(res.body.mode).toBe('testnet');
      expect(res.body.message).toContain('missing active funded signing credentials');
    });

    it('detects simulated anchors under testnet mode and rejects with MISMATCH (never falsifying on-chain status)', async () => {
      // Ensure record has simulated anchor data
      await MedicalRecord.findByIdAndUpdate(sampleRecordId, {
        blockchainAnchor: {
          txDigest: 'SIMULATED_TX_test_123',
          objectId: '0xsimulated_test_123',
          onChainHash: computedSha256,
          status: 'CONFIRMED',
          mode: 'simulated',
          anchoredAt: new Date(),
        },
        status: 'CONFIRMED',
      });

      const prevMode = process.env.SUI_MODE;
      process.env.SUI_MODE = 'testnet';

      const res = await request(app)
        .get(`/api/v1/records/${sampleRecordId}/verify`)
        .set('Authorization', `Bearer ${patientToken}`);

      process.env.SUI_MODE = prevMode;

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('MISMATCH');
      expect(res.body.mode).toBe('testnet');
      expect(res.body.message).toContain('simulated anchor metadata');
    });

    it('queries Sui Testnet fullnode and reports truthful connectivity in checkHealth', async () => {
      const prevMode = process.env.SUI_MODE;
      process.env.SUI_MODE = 'testnet';

      const health = await SuiClient.checkHealth();

      process.env.SUI_MODE = prevMode;

      expect(health.mode).toBe('testnet');
      expect(health.network).toBe('testnet');
      expect(health.packageId).toBe('0x57c69fd3f040fa1a2746ff5ce45ff8644ef728d5737e76a725719f7492006526');
      expect(['UP', 'DEGRADED']).toContain(health.status);
    });
  });

  // Testnet integration test: skipped unless SUI_INTEGRATION=1
  describe.skipIf(!process.env.SUI_INTEGRATION)('Real Sui Testnet Integration', () => {
    it('successfully publishes anchor on Sui testnet', async () => {
      const result = await SuiClient.anchorRecord(sampleRecordId, patientId);
      expect(result.status).toBe('CONFIRMED');
      expect(result.mode).toBe('testnet');
      expect(result.txDigest).toBeDefined();
    });
  });
});
