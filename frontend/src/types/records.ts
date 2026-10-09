export type RecordType =
  | 'LAB_REPORT'
  | 'PRESCRIPTION'
  | 'IMAGING'
  | 'DISCHARGE_SUMMARY'
  | 'CLINICAL_NOTE'
  | 'VACCINATION'
  | 'OTHER';

export type RecordStatus =
  | 'PENDING_ENCRYPTION'
  | 'ENCRYPTED'
  | 'INTEGRITY_VERIFIED'
  | 'INTEGRITY_FAILED';

export type BlockchainStatus = 'NOT_ANCHORED' | 'PENDING' | 'ANCHORED' | 'FAILED';

export interface BlockchainAnchor {
  status: BlockchainStatus;
  txDigest?: string;
  objectId?: string;
  network?: string;
  anchoredAt?: string;
}

export interface MedicalRecord {
  _id: string;
  patientId: string;
  title: string;
  type: RecordType;
  status: RecordStatus;
  sha256: string;
  keyVersion?: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  blockchainAnchor?: BlockchainAnchor;
  metadata?: {
    documentDate?: string;
    clinicDoctorName?: string;
    notes?: string;
    tags?: string[];
  };
  currentVersion?: number;
  versions?: Array<{
    versionNumber: number;
    sha256: string;
    originalFilename?: string;
    sizeBytes?: number;
    changeNote?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export type ConsentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export interface PopulatedUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface AccessRequest {
  _id: string;
  doctorId: PopulatedUser | string;
  patientId: PopulatedUser | string;
  status: ConsentStatus;
  purpose: string;
  recordIds: string[];
  scope: string;
  expiresAt: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  _id: string;
  actorId: string;
  role: string;
  action: string;
  targetId?: string;
  requestId: string;
  prevHash: string;
  hash: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface VerifyResult {
  recordId: string;
  integrityStatus: string;
  storedHash: string;
  computedHash: string;
  matches: boolean;
  blockchainStatus: BlockchainStatus;
  anchoredDigest?: string;
  verifiedAt: string;
}

export interface AiExplanation {
  summary: string;
  keyFindings: string[];
  patientFriendlyExplanation: string;
  terminology: Array<{ term: string; explanation: string }>;
  questionsForClinician: string[];
  disclaimer: string;
  isAiGenerated: boolean;
}
