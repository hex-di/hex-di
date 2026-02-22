import type { ElectronicSignature, SignatureCaptureRequest, SignatureValidationResult } from "./types.js";

/**
 * Service interface for capturing and validating electronic signatures.
 */
export interface SignatureServicePort {
  capture(request: SignatureCaptureRequest): Promise<ElectronicSignature>;
  validate(signature: ElectronicSignature): Promise<SignatureValidationResult>;
}

/**
 * A no-op signature service that always validates successfully.
 * For use in non-regulated environments only.
 */
export const NoopSignatureService: SignatureServicePort = {
  capture(request: SignatureCaptureRequest): Promise<ElectronicSignature> {
    return Promise.resolve({
      signerId: "noop",
      signedAt: new Date().toISOString(),
      meaning: request.meaning,
      validated: true,
      reauthenticated: true,
      signerRoles: request.signerRole !== undefined ? [request.signerRole] : [],
    });
  },
  validate(_signature: ElectronicSignature): Promise<SignatureValidationResult> {
    return Promise.resolve({
      valid: true,
      validatedAt: new Date().toISOString(),
    });
  },
};
