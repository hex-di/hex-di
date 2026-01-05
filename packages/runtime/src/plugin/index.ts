/**
 * Plugin system for @hex-di/runtime.
 *
 * Provides type-safe container extensibility with:
 * - Symbol-based API access: `container[PLUGIN_SYMBOL]`
 * - Plugin dependencies with compile-time validation
 * - Lifecycle hooks for resolution and scope events
 * - Zero overhead when no plugins are registered
 *
 * @example Basic plugin usage
 * ```typescript
 * import {
 *   definePlugin,
 *   createContainer,
 * } from "@hex-di/runtime";
 *
 * const LOGGING = Symbol.for("hex-di/logging");
 *
 * const LoggingPlugin = definePlugin({
 *   name: "logging",
 *   symbol: LOGGING,
 *   createApi() {
 *     return { log: (msg: string) => console.log(msg) };
 *   },
 * });
 *
 * const container = createContainer(graph, {
 *   plugins: [LoggingPlugin],
 * });
 *
 * container[LOGGING].log("Hello!");
 * ```
 *
 * @example Plugin with dependencies
 * ```typescript
 * import { definePlugin, requires } from "@hex-di/runtime";
 *
 * const MetricsPlugin = definePlugin({
 *   name: "metrics",
 *   symbol: METRICS,
 *   requires: [
 *     requires<typeof TRACING, TracingAPI>({
 *       symbol: TRACING,
 *       name: "Tracing",
 *       reason: "Metrics aggregates tracing data",
 *     }),
 *   ] as const,
 *
 *   createApi(context) {
 *     const tracing = context.getDependency(TRACING);
 *     return { getStats: () => compute(tracing.getTraces()) };
 *   },
 * });
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  Plugin,
  PluginDependency,
  PluginContext,
  PluginHooks,
  ScopeEventEmitter,
  ScopeEventInfo,
  ChildContainerInfo,
  ContainerInfo,
  AnyPlugin,
  InferPluginSymbol,
  InferPluginApi,
  InferPluginRequires,
  InferPluginEnhancedBy,
  InferDependencyApi,
  ExtractDependencySymbols,
  ApiFromSymbol,
} from "./types.js";

// Factory functions
export { definePlugin, requires, optionallyRequires } from "./define.js";
export type { DefinePluginConfig } from "./define.js";

// Validation types
export type {
  PluginApiMap,
  PluginAugmentedContainer,
  ValidatePluginOrder,
  MissingPluginDependencyError,
  CircularPluginDependencyError,
  ContainerOptionsWithPlugins,
  CreateContainerWithPluginsResult,
} from "./validation.js";

// Validation utilities
export { extractRequiredSymbols, extractOptionalSymbols, getDependencyName } from "./validation.js";

// Error classes
export {
  PluginError,
  PluginDependencyMissingError,
  PluginCircularDependencyError,
  PluginInitializationError,
  PluginNotFoundError,
  PluginAlreadyRegisteredError,
} from "./errors.js";
export type { PluginErrorCode } from "./errors.js";

// Plugin manager
export { PluginManager } from "./plugin-manager.js";
export type { ComposedHooks } from "./plugin-manager.js";

// Wrapper utilities (Zustand/Redux-style enhancement pattern)
export {
  createPluginWrapper,
  getAppliedWrappers,
  getEnhancedWrapper,
  getDisposalCallbacks,
  APPLIED_WRAPPERS,
} from "./wrapper.js";
export type {
  PluginWrapper,
  EnhanceableContainer,
  WrapperContext,
  WithPlugin,
  ApplyWrapper,
  AppliedWrapper,
  WrapperTracking,
} from "./wrapper.js";

// Composition utilities
export { pipe, compose2, compose3, compose4, compose5 } from "./compose.js";
