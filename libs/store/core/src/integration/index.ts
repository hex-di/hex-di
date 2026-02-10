/**
 * Integration Module
 *
 * Store tracing bridge and integration utilities.
 *
 * @packageDocumentation
 */

export { createStoreTracingBridge } from "./tracing-bridge.js";
export { createStoreLibraryInspector } from "./library-inspector-bridge.js";
export { StoreLibraryInspectorAdapter } from "./library-inspector-adapter.js";
export { createStoreTracingHookAdapter } from "./tracing-hook-adapter.js";
export { createStoreMcpResourceHandler } from "./mcp-resources.js";
export type {
  StoreMcpResourceMap,
  StoreMcpResourceUri,
  StoreMcpResourceHandler,
} from "./mcp-resources.js";
export type {
  StoreTracerLike,
  StoreSpanContext,
  StoreTracingBridgeConfig,
  StoreTracingHook,
} from "./tracing-bridge.js";
