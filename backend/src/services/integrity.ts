export type IntegrityStatus = 'VERIFIED' | 'MISMATCH' | 'NOT_ANCHORED' | 'UNAVAILABLE';

/**
 * Service to evaluate record SHA-256 cryptographic digest integrity (Master Rule 8).
 * "VERIFIED" only when calculated document hash strictly matches the anchored value.
 */
export class IntegrityService {
  public static evaluateIntegrity(
    computedHash: string,
    onChainHash?: string | null,
    chainAvailable = true
  ): IntegrityStatus {
    if (!chainAvailable) {
      return 'UNAVAILABLE';
    }
    if (!onChainHash) {
      return 'NOT_ANCHORED';
    }
    if (computedHash.toLowerCase() === onChainHash.toLowerCase()) {
      return 'VERIFIED';
    }
    return 'MISMATCH';
  }
}
