# MediChain-AI Project Context

## Current Phase
8

## Current Checkpoint
Checkpoint 8 — Sui blockchain

## Status
Completed (Ready for Review)

## Files Changed
- `sui/Move.toml`
- `sui/sources/medical_record_anchor.move`
- `scripts/deploy-sui.sh`
- `scripts/deploy-sui.ps1`
- `backend/src/models/MedicalRecord.ts`
- `backend/src/blockchain/suiClient.ts`
- `backend/src/controllers/record.controller.ts`
- `backend/src/routes/record.ts`
- `backend/tests/sui.test.ts`
- `context.md`

## Tests
- `backend/tests/sui.test.ts`: 7 tests passed (1 integration test skipped unless `SUI_INTEGRATION=1`):
  - Record anchoring in simulated mode stores `txDigest`, `objectId`, and updates status to `CONFIRMED`.
  - Truthful mode labeling in simulated mode (`mode: 'simulated'`).
  - Verification returns `VERIFIED` on actual hash match with truthful mode indicator.
  - Verification returns `MISMATCH` upon on-chain / document hash discrepancy.
  - Verification returns `NOT_ANCHORED` for unanchored documents.
  - Truthful `disabled` / `UNAVAILABLE` handling when `SUI_MODE=disabled`.
  - Security verification: `SUI_ENV_MNEMONIC` and mnemonic phrase are never exposed in responses or logs.
- Total tests: 10 test files, 70 passed, 1 skipped (100% passing).

## Manual Verification
- Typecheck: `npm run typecheck` passed cleanly across backend.
- Tests: `npm test` ran with 70 passed tests in 9.95s.
- Build: `npm run build` compiled cleanly to `dist/`.
- Secret check: `grep -rn "SUI_ENV_MNEMONIC" backend/src` confirmed mnemonic is loaded exclusively server-side and never returned to clients.

## Problems Found
- None.

## Problems Fixed
- None.

## Remaining Issues
- None.

## Required Environment Variables
- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ENCRYPTION_KEY`
- `CORS_ORIGIN`
- `MAX_UPLOAD_MB`
- `SUI_NETWORK`
- `SUI_PACKAGE_ID`
- `SUI_REGISTRY_ID`
- `SUI_ENV_MNEMONIC`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `VITE_API_URL`

## Next Checkpoint
Checkpoint 9 — AI assistant (Server-side AI explanation with schema validation)
