import { createAdapter } from "@hex-di/graph";
import { LoggerPort } from "../application/ports.js";
import { RequestIdPort } from "./ports.js";

export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [RequestIdPort],
  lifetime: "scoped",
  factory: (deps) => ({
    info(message, details) {
      console.log(`[request:${deps.RequestId}] ${message}`, details ?? "");
    },
    error(message, details) {
      console.error(`[request:${deps.RequestId}] ${message}`, details ?? "");
    },
  }),
});
