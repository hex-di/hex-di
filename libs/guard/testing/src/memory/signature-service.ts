import type { ElectronicSignature } from "@hex-di/guard";

/**
 * Configuration for a memory signature service entry.
 */
export interface SignatureConfig {
  readonly signerId: string;
  readonly signerName?: string;
  readonly signerRoles?: readonly string[];
  /** Whether the signature should be returned as validated. Default: true. */
  readonly validated?: boolean;
  /** Whether reauthentication should be reported. Default: false. */
  readonly reauthenticated?: boolean;
  /** Signature algorithm. Default: "HMAC-SHA256". */
  readonly algorithm?: string;
}

/**
 * An in-memory signature service for testing electronic signature flows.
 */
export interface MemorySignatureService {
  /** Captures a signature for the given meaning, using configured defaults. */
  capture(meaning: string, signerRole?: string): Promise<ElectronicSignature>;
  /** Validates the given signature. Always returns the configured validated flag. */
  validate(signature: ElectronicSignature): boolean;
  /** All captured signatures in order. */
  readonly captured: readonly ElectronicSignature[];
  /** Configures the next signature to be captured. */
  configure(config: SignatureConfig): void;
  /** Clears captured signatures. */
  clear(): void;
}

/**
 * Creates an in-memory signature service for testing.
 *
 * @example
 * ```ts
 * const sig = createMemorySignatureService({ signerId: "reviewer-1" });
 * const signature = await sig.capture("approved");
 * expect(signature.signerId).toBe("reviewer-1");
 * ```
 */
export function createMemorySignatureService(
  defaults: SignatureConfig,
): MemorySignatureService {
  let _config: SignatureConfig = defaults;
  const _captured: ElectronicSignature[] = [];

  return {
    get captured(): readonly ElectronicSignature[] {
      return _captured;
    },

    configure(config: SignatureConfig): void {
      _config = config;
    },

    capture(
      meaning: string,
      signerRole?: string,
    ): Promise<ElectronicSignature> {
      const sig: ElectronicSignature = {
        signerId: _config.signerId,
        ...(_config.signerName !== undefined ? { signerName: _config.signerName } : {}),
        signedAt: new Date().toISOString(),
        meaning,
        validated: _config.validated ?? true,
        reauthenticated: _config.reauthenticated ?? false,
        algorithm: _config.algorithm ?? "HMAC-SHA256",
        signerRoles:
          signerRole !== undefined
            ? [signerRole, ...(_config.signerRoles ?? [])]
            : _config.signerRoles,
      };
      _captured.push(sig);
      return Promise.resolve(sig);
    },

    validate(signature: ElectronicSignature): boolean {
      return signature.validated;
    },

    clear(): void {
      _captured.length = 0;
    },
  };
}
