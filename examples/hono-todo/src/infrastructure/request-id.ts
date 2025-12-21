import { createAdapter } from "@hex-di/graph";
import { RequestIdPort } from "./ports.js";

export const RequestIdAdapter = createAdapter({
  provides: RequestIdPort,
  requires: [],
  lifetime: "scoped",
  factory: () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
});
