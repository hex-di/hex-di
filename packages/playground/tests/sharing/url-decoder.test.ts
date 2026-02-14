import { describe, it, expect } from "vitest";
import { deflate } from "pako";
import { decodeShareableState } from "../../src/sharing/url-decoder.js";
import { encodeShareableState } from "../../src/sharing/url-encoder.js";
import type { ShareableState } from "../../src/sharing/types.js";

/**
 * Helper to deflate a string and encode as base64url, bypassing JSON serialization.
 * Used to create test fixtures with valid deflate but invalid JSON content.
 */
function deflateToBase64url(input: string): string {
  const compressed = deflate(input);
  let binary = "";
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("decodeShareableState", () => {
  it("decodes a previously encoded state", () => {
    const state: ShareableState = {
      files: [["main.ts", 'console.log("decoded");']],
      activeFile: "main.ts",
    };

    const encoded = encodeShareableState(state);
    expect(encoded.success).toBe(true);
    if (!encoded.success) return;

    const decoded = decodeShareableState(encoded.encoded);
    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.state.files).toEqual(state.files);
      expect(decoded.state.activeFile).toBe("main.ts");
    }
  });

  it("decodes invalid base64 and returns error", () => {
    // "!!!" is not valid base64
    const result = decodeShareableState("code/!!!invalid-base64!!!");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("invalid-base64");
      expect(result.message).toBeTruthy();
    }
  });

  it("decodes corrupted compressed data and returns error", () => {
    // Valid base64url but not valid deflate data
    const result = decodeShareableState("code/SGVsbG8gV29ybGQ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("decompression-failed");
      expect(result.message).toBeTruthy();
    }
  });

  it("decodes invalid JSON and returns error", () => {
    // Valid deflate data that decompresses to non-JSON text
    const base64 = deflateToBase64url("this is not json");

    const result = decodeShareableState(`code/${base64}`);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("invalid-json");
      expect(result.message).toBeTruthy();
    }
  });
});
