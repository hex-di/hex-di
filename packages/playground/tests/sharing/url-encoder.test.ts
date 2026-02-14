import { describe, it, expect } from "vitest";
import { encodeShareableState } from "../../src/sharing/url-encoder.js";
import type { ShareableState } from "../../src/sharing/types.js";

/**
 * Generate high-entropy content by using crypto.getRandomValues in chunks.
 * crypto.getRandomValues has a 65536 byte limit per call, so we batch.
 * This produces content that deflate cannot compress well.
 */
function generateRandomContent(size: number): string {
  const bytes = new Uint8Array(size);
  const CHUNK = 65536;
  for (let offset = 0; offset < size; offset += CHUNK) {
    const end = Math.min(offset + CHUNK, size);
    const chunk = new Uint8Array(end - offset);
    crypto.getRandomValues(chunk);
    bytes.set(chunk, offset);
  }
  // Convert to hex string (2 chars per byte, all ASCII, very high entropy)
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += bytes[i].toString(16).padStart(2, "0");
  }
  return result;
}

describe("encodeShareableState", () => {
  it("encodes a simple single-file state", () => {
    const state: ShareableState = {
      files: [["main.ts", 'console.log("hello");']],
      activeFile: "main.ts",
    };

    const result = encodeShareableState(state);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.encoded).toMatch(/^code\//);
      // The encoded part should be non-empty
      expect(result.encoded.length).toBeGreaterThan(5);
    }
  });

  it("encodes a multi-file state", () => {
    const state: ShareableState = {
      files: [
        ["main.ts", 'import { foo } from "./foo";\nconsole.log(foo());'],
        ["foo.ts", 'export function foo() { return "bar"; }'],
      ],
      activeFile: "main.ts",
      activePanel: "graph",
    };

    const result = encodeShareableState(state);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.encoded).toMatch(/^code\//);
    }
  });

  it("produces base64url characters (no +, /, or = padding)", () => {
    const state: ShareableState = {
      files: [["main.ts", "const x = 1 + 2 / 3; console.log(x);"]],
      activeFile: "main.ts",
    };

    const result = encodeShareableState(state);
    expect(result.success).toBe(true);
    if (result.success) {
      const encodedPart = result.encoded.replace(/^code\//, "");
      // Should not contain standard base64 characters that are not URL-safe
      expect(encodedPart).not.toMatch(/\+/);
      expect(encodedPart).not.toMatch(/\//);
      expect(encodedPart).not.toMatch(/=$/);
    }
  });

  it("returns size-exceeded for large workspaces exceeding 100KB limit", () => {
    // Generate truly random content that deflate cannot compress well.
    // 200KB of random hex chars produces ~400KB text, which even compressed stays above 100KB.
    const largeContent = generateRandomContent(200 * 1024);
    const state: ShareableState = {
      files: [["main.ts", largeContent]],
      activeFile: "main.ts",
    };

    const result = encodeShareableState(state);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("size-exceeded");
      expect(result.size).toBeGreaterThan(result.limit);
      expect(result.limit).toBe(100 * 1024);
    }
  });
});
