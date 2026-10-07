# MediChain-AI Project Context

## Current Phase
4

## Current Checkpoint
Checkpoint 4 — Authorization and consent

## Status
Completed (Ready for Review)

## Files Changed
- `backend/src/policy/policy.ts`
- `backend/src/services/audit.service.ts`
- `backend/src/utils/hash.ts`
- `backend/src/validators/access.validator.ts`
- `backend/src/controllers/access.controller.ts`
- `backend/src/routes/access.ts`
- `backend/src/app.ts`
- `backend/tests/policy.matrix.test.ts`
- `context.md`

## Tests
- `backend/tests/policy.matrix.test.ts`: 14 tests covering:
  - Policy matrix across actor types, actions, and consent states.
  - Verification that Patient A has full control over their own records only.
  - Verification that Patient A cannot read, download, update, or delete Patient B's records (IDOR protection).
  - Verification that Doctor can NEVER update or delete patient records (always denied).
  - Verification that Doctor access is denied when consent is absent, PENDING, REJECTED, EXPIRED, or REVOKED.
  - Verification that Doctor with APPROVED consent is granted read/download scoped access.
  - Verification that doctor self-requests are rejected.
  - Integration of request creation, patient listing, approval, cryptographic receipt generation, JSON receipt download, and consent revocation.
  - Audit log entries created for `ACCESS_REQUESTED`, `ACCESS_APPROVED`, `ACCESS_REJECTED`, and `ACCESS_REVOKED`.
- Total test count: 6 test files, 40 tests passing (100% pass rate).

## Manual Verification
- Typecheck: `npm run typecheck` passed cleanly across backend.
- Tests: `npm test` passed all 40 tests in 8.21s.
- Build: `npm run build` compiled cleanly to `dist/`.

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
Checkpoint 5 — Medical records (Upload pipeline, list, details, download, update, delete with validation)
