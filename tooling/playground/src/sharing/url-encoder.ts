/**
 * URL Encoder
 *
 * Encodes playground workspace state into a URL-safe hash fragment
 * using JSON -> deflate -> base64url encoding.
 *
 * @packageDocumentation
 */

import { deflate } from "pako";
import type { ShareableState, EncodeShareableResult } from "./types.js";

// =============================================================================
// Constants
// =============================================================================

/** Maximum encoded size in bytes (100KB) */
const MAX_ENCODED_SIZE = 100 * 1024;

/** URL prefix for encoded workspace state */
const CODE_PREFIX = "code/";

// =============================================================================
// Base64url Encoding
// =============================================================================

/**
 * Encodes a Uint8Array to a base64url string (no padding, URL-safe characters).
 *
 * Standard base64 with `+` replaced by `-`, `/` replaced by `_`, and
 * trailing `=` padding removed.
 */
function toBase64url(data: Uint8Array): string {
  // Convert Uint8Array to binary string
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }

  // Encode to standard base64, then make URL-safe
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Encodes a playground workspace state into a URL hash fragment.
 *
 * The encoding process:
 * 1. Serialize the state to JSON
 * 2. Compress with deflate (pako)
 * 3. Encode as base64url
 * 4. Prepend `code/` prefix
 *
 * Returns a result indicating success or failure (e.g., size exceeded).
 */
export function encodeShareableState(state: ShareableState): EncodeShareableResult {
  const json = JSON.stringify(state);
  const compressed = deflate(json);
  const encoded = toBase64url(compressed);
  const fragment = `${CODE_PREFIX}${encoded}`;

  if (fragment.length > MAX_ENCODED_SIZE) {
    return {
      success: false,
      reason: "size-exceeded",
      size: fragment.length,
      limit: MAX_ENCODED_SIZE,
    };
  }

  return {
    success: true,
    encoded: fragment,
  };
}
