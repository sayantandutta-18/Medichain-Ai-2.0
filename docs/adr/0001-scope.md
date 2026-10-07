# ADR 0001: Product Boundary and Scope Definition

## Status
Accepted

## Context
MediChain-AI is designed as a patient-controlled medical records portfolio MVP demonstrating best practices in zero-trust architecture, cryptographic integrity, decentralized metadata anchoring, and controlled AI interaction. Because healthcare software operates in a highly sensitive domain, establishing clear product and legal boundaries from inception is mandatory.

## Decision

### 1. What the System Is
- A decentralized and cryptographically guarded personal health record management system.
- An access delegation platform governed by explicit, revocable patient consent.
- An append-only, tamper-evident audit logging system.
- A verifiable document integrity verification mechanism using SHA-256 and Sui blockchain testnet anchoring.
- A safe AI assistant restricted to document summarization and educational terminology clarification under strict schema validation.

### 2. What the System Is NOT
- **Not a Medical Device or Clinical Diagnostic System:**
  The platform does not provide diagnostic recommendations, clinical treatment protocols, or drug prescription suggestions. It explicitly disclaims any clinical liability.
- **Not a Certified HIPAA, GDPR, or DPDP Compliance Platform:**
  While architected using defense-in-depth principles inspired by privacy regulations (purpose limitation, consent lifecycle, data minimization, audit logging), it is not certified under HIPAA, GDPR Art. 9, or DPDP Act 2023.
- **Not an On-Chain Medical Record Store:**
  Sensitive medical records and health documents will **never** be placed on the blockchain. The Sui blockchain is used strictly for storing cryptographic verification digests (SHA-256) of document contents to prove authenticity and non-tampering.
- **Not an Autonomous Action Engine:**
  AI models do not have tool-calling or direct database execution rights. Medical records are treated as untrusted text strings to mitigate prompt injection.

## Consequences
- All user interfaces must prominently feature disclaimers stating that MediChain-AI is not a diagnostic device.
- Architectural design prioritizes server-side policy enforcement (`can(actor, action, resource)`) over trusting client state.
- Automated tests will verify that access control, tampering detection, and PII protection are strictly maintained.
