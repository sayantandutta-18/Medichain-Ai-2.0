# MediChain-AI Project Context

## Current Phase
0

## Current Checkpoint
Checkpoint 0 — Repository

## Status
Completed (Ready for Review)

## Files Changed
- `.gitignore`
- `.env.example`
- `package.json`
- `docker-compose.yml`
- `README.md`
- `AGENTS.md`
- `GEMINI.md`
- `docs/architecture.md`
- `docs/adr/0001-scope.md`
- `context.md`
- Scaffold directories and `.gitkeep` markers for:
  - `backend/src/{config,controllers,middleware,models,routes,services,validators,utils,blockchain}`
  - `backend/tests`
  - `frontend/src/{api,components,context,pages,routes,types,utils}`
  - `sui`
  - `docs/adr`
  - `scripts`

## Tests
- No application code tests in Checkpoint 0 (scaffold only). Application code begins in Checkpoint 1.

## Manual Verification
- `git status` -> clean staging of all expected scaffold files
- `git check-ignore -v .env node_modules/ dist/ coverage/` -> matches `.gitignore`
- Scanned for uncommitted secrets or credentials (no actual secrets present)

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
Checkpoint 1 — API (Express API with env-driven config and central errors)
