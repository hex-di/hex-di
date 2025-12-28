/**
 * @hex-di/inspector - Container inspection for HexDI.
 *
 * Provides runtime state inspection with two modes:
 *
 * 1. **Pull-only** via `createInspector()` - lightweight, no subscription overhead
 * 2. **Push+Pull** via `InspectorPlugin` - real-time events via `subscribe()`
 *
 * @example Pull-only inspector (no plugin needed)
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { createInspector } from '@hex-di/inspector';
 *
 * const container = createContainer(graph);
 * const inspector = createInspector(container);
 *
 * // Pull-based queries
 * const snapshot = inspector.getSnapshot();
 * const ports = inspector.listPorts();
 * ```
 *
 * @example Plugin with real-time events
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { InspectorPlugin, INSPECTOR } from '@hex-di/inspector';
 *
 * // Create container with plugin - no binding needed!
 * const container = createContainer(graph, {
 *   plugins: [InspectorPlugin],
 * });
 *
 * // Pull-based queries
 * const snapshot = container[INSPECTOR].getSnapshot();
 * if (snapshot.kind === "root") {
 *   console.log(`Initialized: ${snapshot.isInitialized}`);
 * }
 *
 * // Push-based events (only with plugin)
 * const unsubscribe = container[INSPECTOR].subscribe((event) => {
 *   if (event.type === "resolution") {
 *     console.log(`Resolved ${event.portName} in ${event.duration}ms`);
 *   }
 * });
 * ```
 *
 * @example Type-safe access with guards
 * ```typescript
 * import { hasInspector, hasSubscription, INSPECTOR } from '@hex-di/inspector';
 *
 * // Check if container has inspector
 * if (hasInspector(container)) {
 *   const inspector = container[INSPECTOR];
 *
 *   // Check if inspector has subscription (plugin vs standalone)
 *   if (hasSubscription(inspector)) {
 *     inspector.subscribe(handleEvent);
 *   } else {
 *     // Fall back to polling for pull-only inspector
 *     setInterval(() => refresh(inspector.getSnapshot()), 1000);
 *   }
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
// Factory Exports
// =============================================================================

export { createInspector } from "./inspector.js";
export { InspectorPlugin } from "./plugin.js";

// =============================================================================
// Wrapper Export (Zustand/Redux-style enhancement pattern)
// =============================================================================

export { withInspector, type WithInspector } from "./wrapper.js";

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Core API interface
  InspectorAPI,
  // Extended API with subscription (from plugin)
  InspectorWithSubscription,
  // Event types
  InspectorEvent,
  InspectorListener,
  // Types needed by InspectorAPI (from devtools-core)
  ContainerKind,
  ContainerPhase,
  ContainerSnapshot,
  ScopeTree,
} from "./types.js";

// =============================================================================
// Type Guard Exports
// =============================================================================

export { hasSubscription } from "./types.js";
export { hasInspector, getInspectorAPI, type ContainerWithInspector } from "./type-guards.js";

// =============================================================================
// Helper Exports (for advanced use cases)
// =============================================================================

export { detectContainerKind, detectPhase, buildTypedSnapshot } from "./helpers.js";
