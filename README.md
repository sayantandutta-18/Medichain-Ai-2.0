# MediChain-AI

> **Patient-Controlled Medical Records Portfolio MVP with Cryptographic Integrity, Sui Blockchain Anchoring, and Safe Voice & AI Assistance.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Sui Blockchain](https://img.shields.io/badge/Sui-Testnet%20%2F%20Move-4da2ff.svg)](https://sui.io/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-green.svg)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

> [!CAUTION]
> ### CRITICAL DISCLAIMER: NOT A MEDICAL DEVICE
> MediChain-AI is a portfolio educational and technical MVP prototype demonstrating cryptographic access delegation, zero-trust architectures, and decentralized integrity anchoring.  
> **It is NOT a certified medical device, diagnostic platform, clinical decision support software, or regulatory-compliant healthcare platform** (such as HIPAA, GDPR health data, or DPDP Act compliant systems). It must **NEVER** be used for clinical decision-making, diagnosis, medical treatment, or emergency triage.

---

## Executive Summary

Traditional Electronic Health Record (EHR) platforms suffer from fragmented silos, opaque data handling, and vendor lock-in. **MediChain-AI** re-architects medical record governance with **patient sovereignty at its center**:

1. **Zero-Trust Cryptographic Document Storage:** Documents are encrypted at rest with **AES-256-GCM** using a unique 12-byte random IV per encryption and Additional Authenticated Data (AAD) bound to the `recordId` and `patientId`. Plaintext medical records or full medical texts are **never stored on-chain or in unencrypted storage**.
2. **Decentralized Integrity Anchoring:** Raw document SHA-256 integrity digests are anchored to the **Sui blockchain** via custom Move smart contracts, providing cryptographic non-repudiation and proof of existence without exposing confidential health data.
3. **Deny-by-Default Central Authorization:** All access is governed server-side through a single authorization policy matrix (`can(actor, action, resource)`). The frontend is strictly an interface, never the security boundary.
4. **Tamper-Evident Hash-Chained Audit Trail:** Every sensitive action (reads, downloads, grants, revocations, failed attempts) is recorded in an append-only, SHA-256 hash-chained log starting from a canonical genesis hash.
5. **Safe AI & Voice Assistance Guardrails:** AI explanations and voice actions are strictly bound by schema validation (Zod), prompt boundaries, data minimization (PII redaction), and explicit preview-and-confirmation workflows before modifying data (Master Rule 12).

---

## Architectural Principles & Master Rules

MediChain-AI is engineered according to non-negotiable engineering principles:

- **Deny by Default:** No access to records or patient data is granted unless an explicit, active, unexpired, and unrevoked consent grant exists.
- **Cryptographic Independence:** Cryptographic proofs and AES-256-GCM authentication tags guarantee that tampering with ciphertext or AAD is immediately rejected.
- **On-Chain Privacy:** No medical records, patient identifiers, or clinical texts touch the blockchain. Only cryptographic SHA-256 digests and record hashes are anchored.
- **No Stack Traces / Safe Errors:** Client responses always contain a standardized `requestId` and safe, non-revealing error descriptions.
- **Zero Frontend Hardcoded Endpoints:** Zero `localhost` literals in frontend source code (`frontend/src/`) or production bundles (`frontend/dist/`). All endpoints route via configurable environment variables.

---

## Monorepo Layout

```
MediChain-AI/
├── backend/
│   ├── src/
│   │   ├── blockchain/         # Sui Move RPC client & simulated fallbacks
│   │   ├── config/             # Environment validation (Zod) & DB configuration
│   │   ├── controllers/        # REST route handlers & validation logic
│   │   ├── middleware/         # Auth, Helmet, RateLimiting, Request ID, Safe Errors
│   │   ├── models/             # Mongoose schemas (Users, Records, Consents, Audit, Sessions...)
│   │   ├── policy/             # Central policy module (can() deny-by-default matrix)
│   │   ├── routes/             # Express v1 modular routers (Health, Auth, Records, AI...)
│   │   ├── services/           # Business services (Crypto, Audit, AI, Webhook, Notifications)
│   │   └── utils/              # Crypto (AES-256-GCM), Hash (SHA-256), QR (vector SVG)
│   ├── scripts/
│   │   ├── seed.ts             # Comprehensive portfolio demo seed script
│   │   └── verify-audit.ts     # CLI cryptographic audit hash-chain verifier
│   └── tests/                  # 15 Vitest test suites (125 tests, 100% passing)
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios client with interceptors and dynamic base URL
│   │   ├── components/         # Common UI, Modals, Voice Assistant, Layouts
│   │   ├── context/            # Authentication & State management
│   │   ├── pages/              # Patient, Doctor, Admin dashboards & First Responder views
│   │   └── tests/              # 5 Vitest component & integration test suites
│   └── vite.config.ts          # Vite build config with path aliases & Vitest setup
├── sui/
│   ├── Move.toml               # Sui Move package manifest
│   └── sources/
│       └── record_registry.move# Move smart contract module for immutable anchoring
├── docs/                       # Architecture diagrams, ADRs, security boundaries
└── scripts/
    └── seed-demo.ts            # Monorepo runner for demo database seeding
```

---

## 26 Features Portfolio Matrix

| # | Feature | Checkpoint | Description |
|---|---|:---:|---|
| **01** | **Patient Record Upload & Encryption** | CP 03 | AES-256-GCM authenticated encryption with random 12-byte IV per encryption and AAD bound to `recordId\|patientId`. |
| **02** | **Granular Clinical Access Delegation** | CP 04 | Time-bound consent grants (`VIEW`, `DOWNLOAD`, `FULL`) with cryptographically verifiable receipts. |
| **03** | **Sui Blockchain Integrity Anchoring** | CP 05 | On-chain anchoring of SHA-256 source digests via Sui Move contracts (with automated simulated testnet fallback). |
| **04** | **Tamper-Evident Hash-Chained Audit Trail** | CP 06 | Append-only audit trail linking logs via SHA-256 hash chains (`prevHash` + `hash`), verifiable via CLI and API. |
| **05** | **Safe AI Medical Record Explainer** | CP 07 | Patient-friendly, plain-language document breakdown with PII redaction and strict non-diagnostic disclaimers. |
| **06** | **Patient Dashboard & History** | CP 08 | Real-time overview of active medical records, recent access grants, notifications, and security alerts. |
| **07** | **Doctor Dashboard & Clinical Workspace** | CP 09 | Practitioner interface for requesting record access, browsing approved dossiers, and reviewing lab results. |
| **08** | **Admin Governance & Doctor Verification** | CP 10 | Administrative review portal for validating physician medical licenses, audit trail status, and system stats. |
| **09** | **Real-Time Notification Engine** | CP 11 | In-app notification dispatcher for consent requests, approvals, revocations, and system events. |
| **10** | **Time-Bound Temporary Share Links** | CP 12 | Secure, expiring token-gated links for external review without requiring account creation. |
| **11** | **Multi-Version Medical Documenting** | CP 14 | Immutable version tracking for record updates, preserving full historical cryptographic lineage. |
| **12** | **Encrypted Clinical Progress Notes** | CP 14 | Doctor-authored clinical notes encrypted with AES-256-GCM and bound to patient and practitioner identities. |
| **13** | **Longitudinal Vitals & Health Metrics** | CP 14 | Continuous tracking of blood pressure, heart rate, blood glucose, weight, and temperature with clinical bounds. |
| **14** | **Health Goal Tracking & Milestones** | CP 14 | Patient wellness goals with quantifiable targets, milestone logs, and longitudinal trend indicators. |
| **15** | **Caregiver & Proxy Access Management** | CP 14 | Delegated family and caregiver access permissions with scoped authority and revocation controls. |
| **16** | **Clinical Appointment Scheduling** | CP 14 | Doctor-patient appointment coordination with status tracking (scheduled, completed, cancelled). |
| **17** | **Digital Clinical Prescriptions** | CP 14 | Practitioner e-prescribing module tracking drug names, dosage regimens, frequencies, and durations. |
| **18** | **Prescription Drug Interaction Engine** | CP 14 | Deterministic safety screening engine checking known multi-drug interactions (e.g., Warfarin + Aspirin). |
| **19** | **Hospital & Organization Multi-Tenancy** | CP 14 | Role-based organizational memberships linking clinics, departments, and practitioners. |
| **20** | **Security Events & Suspicious Activity Log** | CP 14 | Real-time security telemetry detecting brute-force attempts, session anomalies, and policy denials. |
| **21** | **Emergency Access & Vector SVG QR Code** | CP 15 | First-responder emergency profile access with zero-dependency standalone vector SVG QR matrix generation. |
| **22** | **Multilingual AI Medical Translation** | CP 15 | AI medical explanation and translation into Spanish, French, German, and Hindi with schema validation. |
| **23** | **Dynamic Consent Auto-Expiration Scanner** | CP 15 | Automated expiration engine identifying elapsed consents and executing cryptographic auto-revocations. |
| **24** | **Medical Event Webhooks (HMAC-SHA256)** | CP 15 | Event delivery system dispatching signed HTTP webhooks (`X-MediChain-Signature`) to external endpoints. |
| **25** | **Patient Health Dossier Export** | CP 15 | Comprehensive health history export (records, vitals, prescriptions, goals) with SHA-256 integrity checksum. |
| **26** | **Multi-Device Session & Remote Revocation** | CP 15 | Granular device session manager tracking active clients, IPs, and device types with instant revocation. |
| **VOICE** | **Voice AI Assistant with Preview Guardrail** | CP 15 | Web Speech API speech-to-intent engine requiring explicit visual preview and confirmation per Rule 12. |

---

## System Integration & Health Diagnostics (Checkpoint 16)

The platform includes comprehensive liveness, readiness, and E2E integration subsystems:

- `GET /api/v1/health`: Returns overall system health, uptime, timestamp, memory usage, environment mode, and database connection state.
- `GET /api/v1/health/live`: Lightweight liveness probe for container orchestrators (Kubernetes / Docker) confirming the HTTP process is responsive.
- `GET /api/v1/health/ready`: Readiness probe verifying active MongoDB connectivity and encryption key initialization before traffic routing.
- **End-to-End System Integration Suite (`backend/tests/e2e.system.test.ts`):** 11 sequential lifecycle test steps validating the entire cross-feature pipeline from registration and AES-256-GCM upload to Sui anchoring, consent receipts, clinical notes, drug interactions, voice intent guardrails, QR generation, dossier export, and cryptographic audit hash-chain verification.

---

## Quickstart & Local Setup

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** running locally (`mongodb://localhost:27017/medichain`) or a hosted MongoDB URI

### 2. Environment Configuration
Copy `.env.example` in `backend/` and configure your environment variables:
```bash
# In backend/.env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/medichain
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=1h
ENCRYPTION_KEY=dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXktYmFzZTY0==
CORS_ORIGIN=http://localhost:5173
MAX_UPLOAD_MB=10
SUI_NETWORK=testnet
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Comprehensive Portfolio Demo Data
MediChain-AI includes an automated demo database seeder that populates realistic patients, verified physicians, AES-256-GCM encrypted records, approved consents with verifiable receipts, clinical notes, prescriptions, vitals, emergency profiles, and a valid cryptographic audit trail:
```bash
npm run seed
```

Default seeded credentials:
- **Patient Alice:** `patient.alice@example.dev` / `TestPassword123!`
- **Verified Doctor Clara:** `doctor.clara@example.dev` / `TestPassword123!`
- **System Admin:** `admin.system@example.dev` / `TestPassword123!`

### 5. Verify Cryptographic Audit Hash Chain
Verify the tamper-evident audit trail at any time via CLI:
```bash
npm run verify:audit
```

### 6. Run Development Servers
Start backend and frontend in development mode:
```bash
# Terminal 1: Backend API
npm --prefix backend run dev

# Terminal 2: Frontend App
npm --prefix frontend run dev
```

---

## Test Execution & Verification

MediChain-AI maintains 100% test pass rate across all unit, integration, policy, and E2E suites:

```bash
# Run all backend tests (15 suites, 125 tests)
npm run test

# Run all frontend tests (5 suites, 30 tests)
npm run test:frontend

# Run all suites concurrently
npm run test:all

# Typecheck both backend and frontend
npm run typecheck
npm run typecheck:frontend

# Compile frontend production bundle
npm run build:frontend
```

---

## Security Architecture & Policy Matrix

```
                        +----------------------------+
                        |      Actor + Request       |
                        +--------------+-------------+
                                       |
                                       v
                        +----------------------------+
                        |   can(actor, action, res)  |
                        +--------------+-------------+
                                       |
             +-------------------------+-------------------------+
             |                         |                         |
             v                         v                         v
       [PATIENT Role]            [DOCTOR Role]             [ADMIN Role]
             |                         |                         |
    Owns resource?                     |                   Platform ops &
     /       \              Has active, unexpired,       verification actions
   YES        NO            unrevoked consent grant?              |
    |          |                   /       \                      v
  ALLOW      DENY                YES        NO                  ALLOW
                                  |          |
                                ALLOW      DENY
```

---

## Sui Move Smart Contract Module

Located in `sui/sources/record_registry.move`:
- Exposes `record_registry::anchor_record(registry, sha256_hash, record_uuid, ctx)`.
- Emits verifiable on-chain `RecordAnchoredEvent`.
- Ensures immutable proof-of-existence without exposing sensitive clinical text.
- Integrated seamlessly with testnet RPC and transparent simulated fallback mode.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
#   M e d i c h a i n - A i - 2 . 0  
 