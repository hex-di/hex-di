/**
 * Electronic signature types for 21 CFR Part 11 compliance.
 */

export interface ElectronicSignature {
  readonly signerId: string;
  readonly signerName?: string;
  readonly signedAt: string;
  readonly meaning: string;
  readonly validated: boolean;
  readonly reauthenticated: boolean;
  readonly signerRoles?: ReadonlyArray<string>;
  readonly keyId?: string;
  readonly algorithm?: string;
}

export interface SignatureCaptureRequest {
  readonly meaning: string;
  readonly signerRole?: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
}

export interface ReauthenticationChallenge {
  readonly challengeId: string;
  readonly challengeType: "password" | "mfa" | "certificate";
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface ReauthenticationToken {
  readonly challengeId: string;
  readonly completedAt: string;
  readonly method: string;
}

export interface SignatureValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly validatedAt: string;
}

export interface SignatureError {
  readonly code: "ACL009";
  readonly message: string;
  readonly cause?: unknown;
}
