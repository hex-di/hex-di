import { createHash, timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";
import type { HashDigest } from "@hex-di/crypto";

export function createNodeHashDigest(): HashDigest {
  return Object.freeze({
    sha256Hex(data: string): string {
      return createHash("sha256").update(data, "utf8").digest("hex");
    },
    timingSafeEqual(a: string, b: string): boolean {
      const hashA = createHash("sha256").update(Buffer.from(a, "utf-8")).digest();
      const hashB = createHash("sha256").update(Buffer.from(b, "utf-8")).digest();
      return cryptoTimingSafeEqual(hashA, hashB);
    },
  });
}
