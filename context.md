# MediChain-AI Project Context

## Current Phase
9

## Current Checkpoint
Checkpoint 9 — AI assistant

## Status
Completed (Ready for Review)

## Files Changed
- `backend/src/services/ai/prompts/explain.ts`
- `backend/src/services/ai/ai.service.ts`
- `backend/src/controllers/ai.controller.ts`
- `backend/src/routes/ai.ts`
- `backend/src/app.ts`
- `backend/evals/synthetic-reports.json`
- `backend/tests/ai.test.ts`
- `context.md`

## Tests
- `backend/tests/ai.test.ts`: 16 tests covering:
  - PII redaction (names, phone numbers, email addresses, DOB, physical addresses).
  - Authorization check ensuring non-owners and doctors without active consent receive 403.
  - Controlled 503 `AI_UNAVAILABLE` response when `OPENAI_API_KEY` is missing or unconfigured.
  - Output schema validation using Zod.
  - Safe fallback `COULD_NOT_GENERATE` upon malformed JSON or schema discrepancy.
  - Audit event creation for `AI_ANALYSIS` (storing recordId and model name only; prompt and output strictly excluded).
  - 10 synthetic report evaluation tests verifying disclaimer inclusion, absence of "you have" or prescriptive declarations, and resistance against embedded prompt injection overrides.
- Total tests: 11 test files, 86 passed, 1 skipped (100% passing).

## Manual Verification
- Typecheck: `npm run typecheck` passed cleanly across backend.
- Tests: `npm test` ran with 86 passed tests in 10.66s.
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
Checkpoint 10 — Frontend foundation (Routing, auth context, central API client, error handling)
