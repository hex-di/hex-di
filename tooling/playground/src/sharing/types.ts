/**
 * Sharing Types
 *
 * Defines the data structures for URL-based playground state sharing.
 *
 * @packageDocumentation
 */

// =============================================================================
// ShareableState
// =============================================================================

/**
 * The workspace state that can be encoded into a URL hash for sharing.
 *
 * Uses `[path, content]` tuples instead of a Map for JSON serialization
 * compatibility.
 */
export interface ShareableState {
  /** File path and content pairs */
  readonly files: ReadonlyArray<readonly [string, string]>;
  /** The currently active (open) file path */
  readonly activeFile: string;
  /** The currently active panel, e.g. "graph", "container" */
  readonly activePanel?: string;
}

// =============================================================================
// Encoding Result
// =============================================================================

/**
 * Result of encoding a shareable state into a URL hash fragment.
 */
export interface EncodeResult {
  /** Whether encoding succeeded */
  readonly success: true;
  /** The encoded hash fragment, e.g. "code/eJy..." */
  readonly encoded: string;
}

/**
 * Result when encoding fails due to size limit.
 */
export interface EncodeSizeExceeded {
  readonly success: false;
  /** Reason for failure */
  readonly reason: "size-exceeded";
  /** Actual encoded size in bytes */
  readonly size: number;
  /** Maximum allowed size in bytes */
  readonly limit: number;
}

export type EncodeShareableResult = EncodeResult | EncodeSizeExceeded;

// =============================================================================
// Decoding Result
// =============================================================================

/**
 * Result of decoding a URL hash fragment back into a shareable state.
 */
export interface DecodeSuccess {
  readonly success: true;
  readonly state: ShareableState;
}

export interface DecodeError {
  readonly success: false;
  readonly reason: "invalid-base64" | "decompression-failed" | "invalid-json" | "invalid-structure";
  readonly message: string;
}

export type DecodeShareableResult = DecodeSuccess | DecodeError;
