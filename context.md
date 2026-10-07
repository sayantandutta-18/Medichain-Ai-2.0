# MediChain-AI Project Context

## Current Phase
1

## Current Checkpoint
Checkpoint 1 — API

## Status
Completed (Ready for Review)

## Files Changed
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/vitest.config.ts`
- `backend/src/config/env.ts`
- `backend/src/middleware/requestId.ts`
- `backend/src/middleware/errorHandler.ts`
- `backend/src/routes/health.ts`
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/types/express.d.ts`
- `backend/src/types/morgan.d.ts`
- `backend/src/types/bcryptjs.d.ts`
- `backend/tests/health.test.ts`
- `backend/tests/errors.test.ts`
- `backend/tests/env.test.ts`
- `package.json`
- `context.md`

## Tests
- `backend/tests/health.test.ts`: Validates `GET /api/v1/health` returns status 200 `{ status: "ok" }` and attaches `X-Request-Id`.
- `backend/tests/errors.test.ts`: Validates 404 and central 500 error responses contain `requestId` and strictly omit `stack` traces; verifies header preservation and error sanitization.
- `backend/tests/env.test.ts`: Validates Zod schema fail-fast behavior on missing `PORT`, invalid non-numeric/out-of-range `PORT`, and invalid `NODE_ENV`.
- Results: 3 test files passed, 8 tests passed (0 failures).

## Manual Verification
- `npm run typecheck` passed cleanly across backend.
- `npm test` ran Vitest with all 8 tests passing.
- `npm run build` compiled TypeScript to `dist/` cleanly.
- Fail-fast check: Running server without `PORT` produced `Error: Environment configuration error: PORT: PORT is required` and exited immediately.
- Running server with `PORT=4000 CORS_ORIGIN=http://localhost:5173`:
  - `curl -i http://localhost:4000/api/v1/health` -> returned 200 OK, Helmet headers, CORS headers, `X-Request-Id`, and `{"status":"ok"}`.
  - `curl -i http://localhost:4000/api/v1/does-not-exist` -> returned 404 Not Found, `requestId`, and strictly no `stack` trace.

## Problems Found
1. Module type declarations: `morgan` and `bcryptjs` threw TS7016 during `tsc --noEmit`.
2. Cross-platform script invocation: Windows `cmd.exe` failed invoking `npm` within nested subshells.

## Problems Fixed
1. Added local ambient module declarations in `backend/src/types/morgan.d.ts` and `backend/src/types/bcryptjs.d.ts` without violating Rule 16 (no unlisted packages).
2. Configured root `package.json` scripts to invoke the local Node binary runners directly.

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
Checkpoint 2 — Database (MongoDB connection, core models, indexes, seed script)
