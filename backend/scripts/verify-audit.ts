import { connectDB, disconnectDB } from '../src/config/db.js';
import { AuditService } from '../src/services/audit.service.js';
import { env } from '../src/config/env.js';

export async function runVerifyAudit(): Promise<boolean> {
  console.log('--- Starting MediChain-AI Audit Hash-Chain Verification ---');
  await connectDB(env.MONGODB_URI || 'mongodb://localhost:27017/medichain');

  try {
    const result = await AuditService.verifyChain();
    if (result.valid) {
      console.log(`[VERIFY SUCCESS] All ${result.totalEntries} audit entries are cryptographically intact.`);
      return true;
    } else {
      console.error(
        `[VERIFY TAMPER DETECTED] Broken chain at index ${result.brokenIndex} (Log ID: ${result.logId})`
      );
      console.error(`Reason: ${result.reason}`);
      if (result.expectedHash && result.actualHash) {
        console.error(`Expected: ${result.expectedHash}`);
        console.error(`Actual:   ${result.actualHash}`);
      }
      return false;
    }
  } catch (err) {
    console.error('[VERIFY ERROR] Unexpected failure during verification:', err);
    return false;
  } finally {
    await disconnectDB();
  }
}

if (process.argv[1]?.endsWith('verify-audit.ts') || process.argv[1]?.endsWith('verify-audit.js')) {
  runVerifyAudit().then((success) => process.exit(success ? 0 : 1));
}
