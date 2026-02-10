/**
 * MemoryLoggerAdapter - DI adapter for the memory logger.
 *
 * Provides the MemoryLogger implementation as a LoggerPort adapter
 * for dependency injection. Useful for testing.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { LoggerPort } from "../../ports/logger.js";
import { createMemoryLogger } from "./logger.js";

/**
 * MemoryLoggerAdapter - DI adapter for the memory logger.
 *
 * Provides LoggerPort implementation with in-memory log collection.
 * Uses transient lifetime for test isolation.
 */
export const MemoryLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "transient",
  factory: () => createMemoryLogger(),
});
