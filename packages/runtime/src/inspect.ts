/**
 * Standalone container inspection function.
 *
 * Provides a simple API for inspecting container state without
 * needing to access the container.inspector property.
 *
 * @packageDocumentation
 */

import type { Port, ContainerSnapshot } from "@hex-di/core";
import type { Container, ContainerPhase } from "./types/index.js";
import { INTERNAL_ACCESS } from "./inspection/symbols.js";
import {
  detectContainerKindFromInternal,
  buildTypedSnapshotFromInternal,
} from "./inspection/internal-helpers.js";
import { createInspector } from "./inspection/creation.js";
import type { ContainerInternalState } from "./inspection/internal-state-types.js";

/**
 * Type for objects that have INTERNAL_ACCESS symbol.
 * @internal
 */
interface HasInternalAccess {
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
}

/**
 * Inspects a container and returns a full snapshot of its state.
 *
 * Returns a frozen snapshot including:
 * - All adapters registered in the container
 * - All cached singleton instances
 * - Scope tree structure
 * - Lifetime information for each adapter
 * - Container metadata (name, kind, phase)
 *
 * @param container - The container to inspect
 * @returns A frozen ContainerSnapshot with full state information
 *
 * @example
 * ```typescript
 * import { createContainer, inspect } from '@hex-di/runtime';
 *
 * const container = createContainer({ graph: graph, name: 'App'  });
 * container.resolve(LoggerPort);
 *
 * const snapshot = inspect(container);
 * console.log('Singletons:', snapshot.singletons.length);
 * console.log('Phase:', snapshot.phase);
 * console.log('Kind:', snapshot.kind);
 * ```
 */
export function inspect<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): ContainerSnapshot {
  // Access internal state via symbol
  const internalState = (container as HasInternalAccess)[INTERNAL_ACCESS]();

  // Create runtime inspector for snapshot
  const runtimeInspector = createInspector(container);
  const runtimeSnapshot = runtimeInspector.snapshot();

  // Detect container kind and build typed snapshot
  const containerKind = detectContainerKindFromInternal(internalState);

  return buildTypedSnapshotFromInternal(runtimeSnapshot, containerKind, internalState);
}
