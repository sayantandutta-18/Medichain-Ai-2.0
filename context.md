# MediChain-AI Project Context

## Current Phase
3

## Current Checkpoint
Checkpoint 3 — Authentication

## Status
Completed (Ready for Review)

## Files Changed
- `backend/src/models/User.ts`
- `backend/src/validators/auth.validator.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/routes/auth.ts`
- `backend/src/app.ts`
- `backend/src/types/express.d.ts`
- `backend/tests/auth.test.ts`
- `backend/vitest.config.ts`
- `docs/adr/0002-auth-token-storage.md`
- `context.md`

## Tests
- `backend/tests/auth.test.ts`: 14 integration tests covering:
  - Reject password < 12 characters (400).
  - Reject common passwords (400).
  - Reject registration with role ADMIN via API (400).
  - Successful user registration with bcrypt hash (cost 12) and JWT pair (201).
  - Duplicate email rejection (409).
  - Wrong password and non-existent email rejection with generic error message (401).
  - Successful login returning JWT, hashed refresh token, and lastLoginAt timestamp (200).
  - Missing JWT rejected on protected route (401).
  - Tampered JWT rejected on protected route (401).
  - Expired JWT rejected on protected route (401).
  - Profile retrieval on `GET /api/v1/auth/me` with valid JWT (200).
  - Refresh token rotation (old token invalidated, new pair generated) (200).
  - Logout revoking refresh token (401 on subsequent reuse attempt).
- Total tests: 5 test files, 26 tests passing (100% pass rate).

## Manual Verification
- Typecheck: `npm run typecheck` passed cleanly.
- Tests: `npm test` passed all 26 tests in 7.74s.
- Build: `npm run build` compiled all TypeScript to `dist/`.
- ADR 0002 written in `docs/adr/0002-auth-token-storage.md` documenting decisions between httpOnly cookies vs headers.

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
Checkpoint 4 — Authorization and consent (Central policy module `can()`, consent state machine, access requests, receipts)
