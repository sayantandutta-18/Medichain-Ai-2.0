# MediChain-AI

Patient-controlled medical records portfolio MVP with cryptographic integrity and decentralized anchoring.

> **CRITICAL DISCLAIMER: NOT A MEDICAL DEVICE**  
> MediChain-AI is a portfolio educational prototype. It is **NOT** a certified medical device, diagnostic system, clinical decision support software, or regulatory-compliant healthcare platform (such as HIPAA, GDPR health data, or DPDP Act compliant systems). It must never be used for clinical decision-making, diagnosis, medical treatment, or emergency management.

---

## Product Boundary & Scope

### What MediChain-AI IS:
- **Patient-Controlled Record Ownership:** The patient owns their personal health records, controls access permissions, and can grant or revoke doctor access at will.
- **Client-Side/Server-Side Separation with Strict Authorization:** A deny-by-default server-side policy engine (`can(actor, action, resource)`) preventing Insecure Direct Object References (IDOR).
- **Cryptographic Document Security:** Document payloads are encrypted with AES-256-GCM using random 12-byte IVs, stored authentication tags, and Additional Authenticated Data (AAD) bound to the `recordId` and `patientId`.
- **Verifiable Integrity:** Source document integrity verified via SHA-256 hashes anchored to the Sui blockchain testnet (or truthful simulated/disabled status).
- **Tamper-Evident Audit Logging:** Hash-chained, append-only audit trail verifying that logs have not been altered or deleted.
- **Safe AI Assistance:** Controlled extraction and educational explanation using strict Zod schemas, data minimization (PII redaction), and explicit medical disclaimers without diagnostic conclusions.
- **Safe Voice Assistant:** Web Speech API integration with push-to-talk, structured intent allow-listing, preview-and-confirm workflows for sensitive operations, and tamper-resistant logging.

### What MediChain-AI IS NOT:
- **NOT a Medical Device or Diagnostic Tool:** Does not offer medical advice, diagnostic predictions, or prescription recommendations.
- **NOT a Certified Electronic Health Record (EHR) Platform:** Does not replace clinical hospital systems or certified HIPAA/GDPR clinical workflows.
- **NOT an On-Chain Storage Platform:** Medical documents and sensitive medical texts are NEVER stored on-chain. Only integrity metadata (SHA-256 hash, record ID, patient address) is anchored.
- **NOT an Autonomous AI Agent:** AI cannot execute arbitrary database queries or make autonomous state changes; it treats record text as untrusted data.

---

## Architecture Overview

```
                      +-----------------------------+
                      |       Web Frontend          |
                      |   (React + Vite + Tailwind) |
                      +--------------+--------------+
                                     |
                                     | HTTPS / REST (/api/v1)
                                     v
                      +-----------------------------+
                      |     Express API Gateway     |
                      |  - Request ID & Logging     |
                      |  - Helmet & CORS            |
                      |  - Central Error Middleware |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Policy Engine: can()      |
                      |   (Deny by Default RBAC)    |
                      +--------------+--------------+
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
       v                             v                             v
+--------------+              +---------------+             +--------------+
|   MongoDB    |              | AES-256-GCM   |             | Sui Testnet  |
|  - Users     |              | - Random IV   |             | Move Module  |
|  - Records   |              | - Auth Tag    |             | - Hash only  |
|  - Consents  |              | - Bound AAD   |             | - Verifiable |
|  - Audit Log |              +---------------+             +--------------+
+--------------+
```

---

## Monorepo Layout

- `backend/`: Node.js, Express, TypeScript, Mongoose, Vitest, Supertest
- `frontend/`: React, TypeScript, Vite, Tailwind CSS, Lucide icons
- `sui/`: Move smart contract package for decentralized anchoring
- `docs/`: Architecture diagrams, decision records (ADRs), database documentation
- `scripts/`: Development and deployment automation scripts

---

## Setup & Getting Started

Refer to `.env.example` for required environment variables. Copy `.env.example` to `.env` in your local environment and configure your database and security credentials. Never commit `.env` or any production secrets.
