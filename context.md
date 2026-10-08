# MediChain-AI Project Context

## Current Phase
10

## Current Checkpoint
Checkpoint 10 — Frontend foundation (Routing, auth context, central API client, error handling)

## Status
Completed (Ready for Review)

## Files Changed
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `frontend/postcss.config.js`
- `frontend/tailwind.config.js`
- `frontend/index.html`
- `frontend/src/vite-env.d.ts`
- `frontend/src/index.css`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/types/auth.ts`
- `frontend/src/api/client.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/routes/ProtectedRoute.tsx`
- `frontend/src/routes/RoleRoute.tsx`
- `frontend/src/components/ErrorBoundary.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/NotFound.tsx`
- `frontend/src/setupTests.ts`
- `frontend/src/tests/auth.test.tsx`
- `package.json`
- `context.md`

## Tests
- `frontend/src/tests/auth.test.tsx`: 8 tests covering:
  - Central API client baseURL derived from `VITE_API_URL || '/api/v1'`.
  - In-memory Authorization Bearer header attachment.
  - Automatic session cleanup on 401 response via unauthorized callback.
  - Session restoration strictly from server `/auth/me` on mount.
  - Safe session clearing when `/auth/me` returns 401 or network error.
  - ProtectedRoute redirection to `/login` for unauthenticated requests.
  - ProtectedRoute rendering for authenticated users.
  - RoleRoute authorization enforcement redirecting unauthorized roles to home.
- Backend regression tests: 11 test files, 86 passed, 1 skipped (100% passing).
- Total tests passing: 94 tests passed, 1 skipped.

## Manual Verification
- Frontend typecheck: `npm run typecheck:frontend` passed with zero errors.
- Frontend build: `npm run build` compiled cleanly into `frontend/dist/`.
- Localhost verification: Verified 0 occurrences of `localhost` in both `frontend/src/` and `frontend/dist/`.
- Backend typecheck: `npm run typecheck` passed cleanly across backend.

## Problems Found
- jsdom threw unhandled navigation error upon setting `window.location.href`.
- `vite/client` types needed explicit declaration for `import.meta.env`.

## Problems Fixed
- Handled navigation safely with test mode guard to silence jsdom navigation warning in test runner.
- Added `frontend/src/vite-env.d.ts` with explicit `ImportMetaEnv` typing.

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
Checkpoint 11 — Patient dashboard (Real APIs, upload with progress, record details, access requests, verification)
