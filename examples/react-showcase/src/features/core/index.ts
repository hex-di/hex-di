/**
 * Core feature public API.
 *
 * @packageDocumentation
 */

// Types
export type { Config, Logger } from "./types.js";

// Ports
export { ConfigPort, LoggerPort, type CorePorts } from "./di/ports.js";

// Adapters
export {
  ConfigAdapter,
  ConsoleLoggerAdapter,
  SilentLoggerAdapter,
  getLoggerAdapter,
  loggerAdapters,
} from "./di/adapters/index.js";

// Feature bundle
export { coreFeature } from "./di/bundle.js";
