import { port } from "@hex-di/core";
import type { HashDigest } from "./types.js";

export const HashDigestPort = port<HashDigest>()({
  name: "HashDigest",
  direction: "outbound",
  description: "Cryptographic hash and constant-time comparison operations",
  category: "crypto",
});
