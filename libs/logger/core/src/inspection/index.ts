/**
 * Logging inspection module.
 *
 * Provides runtime observability for the logging system through
 * pull-based queries and push-based event subscriptions.
 *
 * @packageDocumentation
 */

// Types
export type {
  LoggingSnapshot,
  HandlerInfo,
  SamplingStatistics,
  RedactionStatistics,
  ContextUsageStatistics,
  TimeWindowOptions,
  RecentEntriesOptions,
} from "./snapshot.js";

// Events
export type { LoggerInspectorEvent } from "./events.js";

// Inspector
export type {
  LoggerInspector,
  LoggerInspectorListener,
  LoggerInspectorAdapter,
  CreateLoggerInspectorOptions,
} from "./inspector.js";
export { createLoggerInspectorAdapter } from "./inspector.js";

// Port
export { LoggerInspectorPort } from "./inspector-port.js";

// Library inspector bridge
export {
  createLoggerLibraryInspector,
  LoggerLibraryInspectorPort,
} from "./library-inspector-bridge.js";

// Library inspector adapter
export { LoggerLibraryInspectorAdapter } from "./library-inspector-adapter.js";

// Container integration
export { createLazyLoggerInspector } from "./container-integration.js";
