/**
 * Inspector factory with WeakMap caching.
 *
 * Creates InspectorAPI instances from containers with automatic caching
 * for performance. Uses InternalAccessible interface for type-safe access.
 *
 * @packageDocumentation
 */

import { createInspector as runtimeCreateInspector } from "../../inspector/creation.js";
import type { InternalAccessible } from "../../inspector/creation.js";
import { INTERNAL_ACCESS } from "../../inspector/symbols.js";
import type { ContainerKind, ContainerSnapshot, ScopeTree } from "@hex-di/plugin";
import type { InspectorAPI } from "./types.js";
import {
  detectContainerKindFromInternal,
  detectPhaseFromSnapshot,
  buildTypedSnapshotFromInternal,
} from "./internal-helpers.js";

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
 * This is the pull-based inspector that doesn't include subscription support.
 * For push-based subscriptions, use InspectorPlugin instead.
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
 * ```
 */
export function createInspector(container: InternalAccessible): InspectorAPI {
  // Check cache first
  const cached = inspectorCache.get(container);
  if (cached !== undefined) {
    return cached;
  }

  // Create runtime inspector
  const runtimeInspector = runtimeCreateInspector(container);

  // Detect container kind from internal state
  const internalState = container[INTERNAL_ACCESS]();
  const containerKind = detectContainerKindFromInternal(internalState);

  // Create inspector API wrapper
  const inspector: InspectorAPI = Object.freeze({
    getSnapshot(): ContainerSnapshot {
      const snapshot = runtimeInspector.snapshot();
      return buildTypedSnapshotFromInternal(snapshot, containerKind, internalState);
    },

    getScopeTree(): ScopeTree {
      return runtimeInspector.getScopeTree();
    },

    listPorts(): readonly string[] {
      return runtimeInspector.listPorts();
    },

    isResolved(portName: string): boolean | "scope-required" {
      return runtimeInspector.isResolved(portName);
    },

    getContainerKind(): ContainerKind {
      return containerKind;
    },

    getPhase() {
      const snapshot = runtimeInspector.snapshot();
      return detectPhaseFromSnapshot(snapshot, containerKind);
    },

    get isDisposed(): boolean {
      return runtimeInspector.snapshot().isDisposed;
    },

    // subscribe is undefined for pull-only inspector
    subscribe: undefined,
  });

  // Cache and return
  inspectorCache.set(container, inspector);
  return inspector;
}
