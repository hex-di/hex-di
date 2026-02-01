/**
 * Inspector factory with WeakMap caching.
 *
 * Creates InspectorAPI instances from containers with automatic caching
 * for performance. Uses InternalAccessible interface for type-safe access.
 *
 * @packageDocumentation
 */

import { createBuiltinInspectorAPI } from "./builtin-api.js";
import type { InternalAccessible } from "./creation.js";
import type { InspectorAPI } from "./types.js";

// =============================================================================
// Inspector Cache
// =============================================================================

/**
 * WeakMap cache for inspector instances.
 * Enables automatic cleanup when container is garbage collected.
 * @internal
 */
const inspectorCache = new WeakMap<InternalAccessible, InspectorAPI>();

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates an InspectorAPI from a container.
 *
 * Uses WeakMap caching for performance - calling multiple times with the
 * same container returns the same inspector instance.
 *
 * @param container - Any object satisfying InternalAccessible (Container or wrapper)
 * @returns An InspectorAPI for inspecting container state
 *
 * @example
 * ```typescript
 * import { createInspector } from '@hex-di/runtime';
 *
 * // Create inspector from container
 * const inspector = createInspector(container);
 *
 * // Get snapshot
 * const snapshot = inspector.getSnapshot();
 * console.log(`Kind: ${snapshot.kind}, Phase: ${snapshot.phase}`);
 *
 * // List ports
 * const ports = inspector.listPorts();
 * console.log(`Ports: ${ports.join(', ')}`);
 *
 * // Subscribe to events
 * const unsubscribe = inspector.subscribe(event => {
 *   console.log('Event:', event.type);
 * });
 * ```
 */
export function createInspector(container: InternalAccessible): InspectorAPI {
  // Check cache first
  const cached = inspectorCache.get(container);
  if (cached !== undefined) {
    return cached;
  }

  // Create full inspector with all methods
  const inspector = createBuiltinInspectorAPI(container);

  // Cache and return
  inspectorCache.set(container, inspector);
  return inspector;
}
