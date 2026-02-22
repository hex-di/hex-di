/**
 * URL Decoder
 *
 * Decodes a URL hash fragment back into a playground workspace state.
 * Reverses the base64url -> inflate -> JSON parse encoding.
 *
 * @packageDocumentation
 */

import { inflate } from "pako";
import type { ShareableState, DecodeShareableResult } from "./types.js";

// =============================================================================
// Base64url Decoding
// =============================================================================

/**
 * Decodes a base64url string to a Uint8Array.
 *
 * Restores standard base64 characters (`-` to `+`, `_` to `/`) and
 * adds back any needed padding before decoding.
 */
function fromBase64url(encoded: string): Uint8Array {
  // Restore standard base64 characters
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  const padLength = (4 - (base64.length % 4)) % 4;
  base64 += "=".repeat(padLength);

  // Decode base64 to binary string
  const binary = atob(base64);

  // Convert to Uint8Array
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Type guard for ShareableState structure validation.
 */
function isShareableState(value: unknown): value is ShareableState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Validate files: must be an array of [string, string] tuples
  if (!Array.isArray(obj["files"])) {
    return false;
  }
  for (const entry of obj["files"]) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return false;
    }
    if (typeof entry[0] !== "string" || typeof entry[1] !== "string") {
      return false;
    }
  }

  // Validate activeFile: must be a string
  if (typeof obj["activeFile"] !== "string") {
    return false;
  }

  // Validate activePanel: optional, but if present must be a string
  if (obj["activePanel"] !== undefined && typeof obj["activePanel"] !== "string") {
    return false;
  }

  return true;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Decodes a URL hash fragment (without the leading `#`) back into
 * a playground workspace state.
 *
 * Supports two prefixes:
 * - `code/<encoded>` — full workspace state
 * - `example/<id>` — example deep link (returns the ID for lookup)
 *
 * The decoding process for `code/` prefix:
 * 1. Strip the `code/` prefix
 * 2. Decode base64url to bytes
 * 3. Inflate (decompress) with pako
 * 4. Parse JSON
 * 5. Validate structure
 */
export function decodeShareableState(hash: string): DecodeShareableResult {
  // Strip the code/ prefix
  const encoded = hash.replace(/^code\//, "");

  // Step 1: Decode base64url
  let compressed: Uint8Array;
  try {
    compressed = fromBase64url(encoded);
  } catch {
    return {
      success: false,
      reason: "invalid-base64",
      message: "Failed to decode base64url data",
    };
  }

  // Step 2: Inflate (decompress)
  let json: string;
  try {
    json = inflate(compressed, { to: "string" });
  } catch {
    return {
      success: false,
      reason: "decompression-failed",
      message: "Failed to decompress deflated data",
    };
  }

  // Step 3: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      success: false,
      reason: "invalid-json",
      message: "Failed to parse JSON from decompressed data",
    };
  }

  // Step 4: Validate structure
  if (!isShareableState(parsed)) {
    return {
      success: false,
      reason: "invalid-structure",
      message: "Decoded data does not match ShareableState structure",
    };
  }

  return {
    success: true,
    state: parsed,
  };
}
