# MediChain-AI Database Schema & Indexes

This document details all Mongoose models, their collection schemas, defined indexes, and the specific query patterns they support.

All models incorporate a `schemaVersion` integer field (default `1`) to facilitate zero-downtime schema evolution and migrations.

---

## 1. Collections & Indexes

### `User`
- **Fields:** `email`, `passwordHash`, `role` (PATIENT | DOCTOR | ADMIN), `firstName`, `lastName`, `lastLoginAt`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ email: 1 }` (Unique): Fast authentication query by email (`User.findOne({ email })`) and duplicate account prevention.

### `MedicalRecord`
- **Fields:** `patientId`, `title`, `type`, `status`, `encryptedPayload` (ciphertext, iv, authTag, keyVersion), `sha256`, `keyVersion`, `originalFilename`, `mimeType`, `sizeBytes`, `deletedAt` (soft delete), `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ patientId: 1, createdAt: -1 }` (Compound): Powers paginated retrieval of a patient's medical records ordered from newest to oldest (`MedicalRecord.find({ patientId, deletedAt: null }).sort({ createdAt: -1 })`).
  - `{ sha256: 1 }`: Powers duplicate upload detection by document cryptographic content hash.

### `AccessRequest`
- **Fields:** `patientId`, `doctorId`, `status` (PENDING | APPROVED | REJECTED | REVOKED | EXPIRED), `scope` (VIEW | DOWNLOAD | FULL), `purpose`, `expiresAt`, `decidedAt`, `receipt`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ patientId: 1, doctorId: 1, status: 1 }` (Compound): Core policy evaluation index. Powers `can(doctor, action, record)` checks to determine whether an active `APPROVED` consent request exists between a specific doctor and patient.

### `AuditLog`
- **Fields:** `actorId`, `role`, `action`, `targetId`, `requestId`, `ip`, `prevHash`, `hash`, `metadata`, `createdAt`, `schemaVersion`
- **Indexes:**
  - `{ actorId: 1, createdAt: -1 }` (Compound): Scoped retrieval of an actor's personal audit log trail (`GET /api/v1/audit/me`) without scanning unrelated logs.
  - `{ hash: 1 }` (Unique): Enforces unique hash chain entries and accelerates verification lookups.
  - `{ requestId: 1 }`: Enables correlating multiple audit events produced during a single API transaction.

### `ShareLink`
- **Fields:** `tokenHash`, `patientId`, `scope` (EMERGENCY_CARD | RECORD), `recordId`, `expiresAt`, `revoked`, `singleUse`, `used`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ tokenHash: 1 }` (Unique): Instant token resolution by SHA-256 hash of the presented public URL token.
  - `{ expiresAt: 1 }` (TTL: `expireAfterSeconds: 0`): MongoDB native automatic deletion of expired share links.

### `Notification`
- **Fields:** `userId`, `type`, `title`, `message`, `read`, `metadata`, `expiresAt`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ userId: 1 }`: Enables fast inbox lookups.
  - `{ expiresAt: 1 }` (TTL: `expireAfterSeconds: 0`): Purges aged notifications automatically.

### `Appointment`
- **Fields:** `patientId`, `doctorId`, `slotStart`, `slotEnd`, `status`, `reason`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ doctorId: 1, slotStart: 1 }` (Unique Compound): Eliminates booking race conditions, ensuring a doctor cannot be double-booked for the same timeslot.

### `Prescription`
- **Fields:** `patientId`, `doctorId`, `recordId`, `medications` array, `notes`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `patientId`: Fast query of prescriptions by patient.

### `EmergencyProfile`
- **Fields:** `patientId` (unique), `bloodGroup`, `allergies`, `emergencyContacts` array, `conditionsSummary`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ patientId: 1 }` (Unique): Instant resolution of emergency health data for a given patient.

### `CaregiverAccess`
- **Fields:** `patientId`, `caregiverId`, `scopes`, `expiresAt`, `revoked`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ patientId: 1, caregiverId: 1 }` (Compound): Querying delegated authority between patient and caregiver.

### `Organization`
- **Fields:** `name`, `code` (unique), `type`, `verified`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ code: 1 }` (Unique): Hospital / clinic code lookup.

### `Membership`
- **Fields:** `organizationId`, `userId`, `role` (ADMIN | MEMBER | DOCTOR | STAFF), `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ organizationId: 1, userId: 1 }` (Unique Compound): Resolves user tenant permissions and organization boundaries.

### `SecurityEvent`
- **Fields:** `actorId`, `eventType`, `severity`, `ruleName`, `details`, `ip`, `requestId`, `schemaVersion`, `timestamps`
- **Indexes:**
  - `{ eventType: 1, createdAt: -1 }`: Threat detection and anomaly monitoring.
