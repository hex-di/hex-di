/**
 * Logging adapters.
 *
 * @packageDocumentation
 */

export { NoOpLoggerAdapter, NOOP_LOGGER } from "./noop/index.js";
export { MemoryLoggerAdapter, createMemoryLogger, type MemoryLogger } from "./memory/index.js";
export {
  ConsoleLoggerAdapter,
  createConsoleLogger,
  type ConsoleLoggerOptions,
} from "./console/index.js";
export { ScopedLoggerAdapter, createHandlerLogger } from "./scoped/index.js";
