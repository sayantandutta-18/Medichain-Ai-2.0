# MediChain-AI Architecture

## High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client ["Client Layer"]
        UI["React Web Application (Vite + TS)"]
        Voice["Web Speech Interface (Push-to-Talk)"]
    end

    subgraph Gateway ["API Gateway Layer (Express v1)"]
        ReqId["Request ID Middleware (uuid)"]
        SecHeaders["Helmet & CORS origin security"]
        RateLimit["Per-route Rate Limiter"]
        BodyParser["Body Parser (Size Limits)"]
        CentralErr["Central Error Middleware (No stack leaks)"]
    end

    subgraph AuthPolicy ["Authentication & Authorization"]
        AuthMid["requireAuth (JWT Verification)"]
        PolicyModule["Policy Module: can(actor, action, resource)"]
        ConsentEngine["Consent State Machine (PENDING / APPROVED / REJECTED / REVOKED)"]
    end

    subgraph BusinessLogic ["Core Services"]
        RecordService["Record Service (Upload, Metadata, Soft Delete)"]
        CryptoService["Crypto Service (AES-256-GCM, AAD binding)"]
        AuditService["Audit Service (Hash-Chained Append-Only)"]
        AIService["AI Service (Zod schema validation, PII redaction)"]
        SuiService["Sui Anchor Service (Move Contract, Testnet/Simulated)"]
    end

    subgraph Persistence ["Data & Blockchain Layer"]
        MongoDB[("MongoDB Database (Mongoose)")]
        SuiBlockchain["Sui Blockchain (Anchor Metadata Only)"]
        OpenAI["OpenAI API (External LLM)"]
    end

    UI --> ReqId
    Voice --> ReqId
    ReqId --> SecHeaders
    SecHeaders --> RateLimit
    RateLimit --> BodyParser
    BodyParser --> AuthMid
    AuthMid --> PolicyModule
    PolicyModule --> ConsentEngine
    ConsentEngine --> RecordService
    RecordService --> CryptoService
    RecordService --> MongoDB
    RecordService --> AuditService
    AuditService --> MongoDB
    RecordService --> SuiService
    SuiService --> SuiBlockchain
    PolicyModule --> AIService
    AIService --> OpenAI
    CentralErr -. catches errors .-> UI
```

---

## Data Pipeline: Record Upload & Ingestion

```mermaid
flowchart LR
    Upload["Client File Upload"] --> Memory["Multer Memory Buffer"]
    Memory --> MIMECheck{"MIME Allow-list Check"}
    MIMECheck -- Valid --> MagicBytes{"Magic Byte Signature"}
    MIMECheck -- Invalid --> Reject["Reject 400"]
    MagicBytes -- Valid --> Hash["SHA-256 Compute"]
    MagicBytes -- Invalid --> Reject
    Hash --> DupeCheck{"Duplicate Hash Check"}
    DupeCheck -- Exists --> RejectDupe["Reject 409 (Duplicate)"]
    DupeCheck -- New --> ExifStrip["EXIF Metadata Stripping"]
    ExifStrip --> Encrypt["AES-256-GCM Encrypt with AAD"]
    Encrypt --> DB["Persist Record in MongoDB"]
    DB --> Audit["Record Audit Event (RECORD_CREATED)"]
    Audit --> Sui["Async Anchor SHA-256 to Sui"]
```

---

## Security Boundaries & Guarantees

1. **Deny-by-Default Policy Engine:**
   - Every request touching records, audit logs, or AI features routes through `can(actor, action, resource)`.
   - Patients have full control over their own records only.
   - Doctors can only view/download records if they hold an `APPROVED`, unexpired, unrevoked `AccessRequest` matching the requested record.
   - Doctors cannot update or delete records under any condition.

2. **Cryptographic Protection at Rest:**
   - AES-256-GCM authenticated encryption.
   - Fresh random 12-byte IV per encryption operation.
   - Authentication tag stored alongside the ciphertext.
   - Additional Authenticated Data (AAD) bound to `recordId|patientId` to prevent ciphertext relocation attacks.

3. **Tamper-Evident Hash-Chained Audit Trail:**
   - Each audit entry contains `prevHash` and `hash = SHA256(canonicalJson(entry) + prevHash)`.
   - Any modification to past entries breaks the verifiable hash chain.

4. **Zero Document Leaks On-Chain:**
   - No medical documents, patient PII, or document contents are ever committed to the blockchain.
   - Only the record's cryptographic digest (`SHA-256`), record ID, and owner address are anchored to Sui.

5. **Safe AI & Voice Interaction:**
   - System prompt instructs model never to diagnose or prescribe.
   - Direct PII redacted before sending text to external providers.
   - LLM responses strictly validated against Zod schemas; schema errors return controlled fallbacks.
   - Voice actions altering state require explicit confirmation tokens.
