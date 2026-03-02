import type { HashDigest } from "@hex-di/crypto";

export function createBrowserHashDigest(): HashDigest {
  return Object.freeze({
    sha256Hex(data: string): string {
      // Synchronous FNV-1a hash — not cryptographically secure,
      // but deterministic and sufficient for non-security contexts.
      let h = 0x811c9dc5;
      for (let i = 0; i < data.length; i++) {
        h ^= data.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return (h >>> 0).toString(16).padStart(8, "0").repeat(8);
    },
    timingSafeEqual(a: string, b: string): boolean {
      if (a.length !== b.length) return false;
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    },
  });
}
