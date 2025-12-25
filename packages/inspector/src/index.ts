/**
 * @hex-di/inspector - Container inspection plugin for HexDI.
 *
 * Provides runtime state inspection via the InspectorPlugin:
 * - Pull-based queries: getSnapshot(), getScopeTree(), listPorts(), isResolved()
 * - Push-based events: subscribe() for real-time UI updates
 * - Type-safe access via INSPECTOR symbol and type guards
 *
 * @example Basic usage
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { createInspectorPlugin, INSPECTOR, hasInspector } from '@hex-di/inspector';
 *
 * // Create inspector plugin
 * const { plugin: InspectorPlugin, bindContainer } = createInspectorPlugin();
 *
 * // Create container with plugin
 * const container = createContainer(graph, {
 *   plugins: [InspectorPlugin],
 * });
 *
 * // Bind container for inspection
 * bindContainer(container);
 *
 * // Use pull-based API
 * const snapshot = container[INSPECTOR].getSnapshot();
 * if (snapshot.kind === "root") {
 *   console.log(`Initialized: ${snapshot.isInitialized}`);
 * }
 *
 * // Use push-based API
 * const unsubscribe = container[INSPECTOR].subscribe((event) => {
 *   if (event.type === "resolution") {
 *     console.log(`Resolved ${event.portName} in ${event.duration}ms`);
 *   }
 * });
 *
 * // Type-safe access with type guard
 * if (hasInspector(container)) {
 *   const phase = container[INSPECTOR].getPhase();
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Symbol Export
// =============================================================================

export { INSPECTOR } from "./symbols.js";

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // API interface
  InspectorAPI,
  InspectorEvent,
  InspectorListener,
  // Re-exports from devtools-core for convenience
  ContainerKind,
  ContainerPhase,
  ContainerSnapshot,
  ScopeTree,
  ScopeInfo,
} from "./types.js";

// =============================================================================
// Type Guard Exports
// =============================================================================

export { hasInspector, getInspectorAPI, type ContainerWithInspector } from "./type-guards.js";

// =============================================================================
// Plugin Export
// =============================================================================

export { createInspectorPlugin } from "./plugin.js";

// =============================================================================
// Helper Exports (for advanced use cases)
// =============================================================================

export { detectContainerKind, detectPhase, buildTypedSnapshot } from "./helpers.js";
