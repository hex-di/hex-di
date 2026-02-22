import { createHash, timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";

/**
 * Performs a constant-time string comparison to prevent timing attacks.
 *
 * Both strings are hashed with SHA-256 before comparison, so the comparison
 * time is independent of string length and content.
 *
 * Returns true if and only if the two strings are identical.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(Buffer.from(a, "utf-8")).digest();
  const hashB = createHash("sha256").update(Buffer.from(b, "utf-8")).digest();
  return cryptoTimingSafeEqual(hashA, hashB);
}
