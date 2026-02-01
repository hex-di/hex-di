/**
 * Helper functions for container kind detection and typed snapshot building.
 *
 * These utilities convert runtime container inspector data into strongly-typed
 * discriminated union snapshots for type-safe consumption.
 *
 * @packageDocumentation
 */

import type { Container, ContainerPhase } from "../types.js";
import { INTERNAL_ACCESS } from "./symbols.js";
import type { Port } from "@hex-di/core";
import type {
  ContainerKind,
  ContainerPhase as TypedPhase,
  ContainerSnapshot,
  RootContainerSnapshot,
  ChildContainerSnapshot,
  LazyContainerSnapshot,
  ScopeSnapshot,
  ScopeTree,
  SingletonEntry,
  InheritanceMode,
} from "@hex-di/core";
import type { ContainerSnapshot as RuntimeSnapshot } from "./internal-state-types.js";

// =============================================================================
// Container Kind Detection
// =============================================================================

/**
 * Metadata for detecting container kind.
 * @internal
 */
interface ContainerKindMetadata {
  readonly isLazy: boolean;
  readonly isChild: boolean;
  readonly isScope: boolean;
  readonly parentId: string | null;
}

/**
 * Detects the container kind from a container instance.
 *
 * Uses structural checks to determine if the container is:
 * - root: The main container created via createContainer()
 * - child: A container created via createChild() with inheritance
 * - lazy: A lazy-loaded container created via createLazyChild()
 * - scope: A scoped container created via createScope()
 *
 * @param container - The container to inspect
 * @returns The detected container kind
 *
 * @internal
 */
export function detectContainerKind<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): ContainerKind {
  const metadata = extractKindMetadata(container);

  if (metadata.isScope) {
    return "scope";
  }
  if (metadata.isLazy) {
    return "lazy";
  }
  if (metadata.isChild) {
    return "child";
  }
  return "root";
}

/**
 * Extracts metadata for container kind detection.
 * @internal
 */
function extractKindMetadata<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): ContainerKindMetadata {
  // Check for lazy container markers
  const isLazy = "load" in container && typeof container.load === "function";

  // Check for child container markers (has parent reference)
  // Child containers are created with createChild() and share/fork/isolate from parent
  const isChild = !isLazy && hasParentReference(container);

  // Check for scope markers
  // Scopes are created with createScope() and have a scope ID
  const isScope = hasScopeMarker(container);

  // Extract parent ID if available
  const parentId = extractParentId(container);

  return {
    isLazy,
    isChild,
    isScope,
    parentId,
  };
}

/**
 * Checks if a container has a parent reference (indicates child container).
 * @internal
 */
function hasParentReference<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): boolean {
  // Check for parent property or inherited state marker
  // This is a heuristic - actual implementation depends on container internals
  return "_parent" in container || "_parentContainer" in container;
}

/**
 * Checks if a container is a scope.
 * @internal
 */
function hasScopeMarker<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): boolean {
  // Scopes have a scopeId and are created via createScope()
  return "_scopeId" in container || "scopeId" in container;
}

/**
 * Extracts the parent ID from a container if available.
 * @internal
 */
function extractParentId<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(_container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): string | null {
  // Implementation depends on container internals
  // For now, return null - will be enhanced when container exposes parent info
  return null;
}

// =============================================================================
// Phase Detection
// =============================================================================

/**
 * Detects the current phase of a container based on its kind and state.
 *
 * @param container - The container to inspect
 * @param runtimeSnapshot - The runtime snapshot from createInspector()
 * @param kind - The container kind (detected or provided)
 * @returns The current container phase
 *
 * @internal
 */
export function detectPhase<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>,
  runtimeSnapshot: RuntimeSnapshot,
  kind: ContainerKind
): TypedPhase {
  // Handle disposed state first (applies to all kinds)
  if (runtimeSnapshot.isDisposed) {
    return "disposed";
  }

  switch (kind) {
    case "root":
      return detectRootPhase(container);
    case "child":
      return "initialized"; // Child containers are always initialized on creation
    case "lazy":
      return detectLazyPhase(container);
    case "scope":
      return "active"; // Scopes are active until disposed
    default:
      return "initialized";
  }
}

/**
 * Detects the phase of a root container.
 * @internal
 */
function detectRootPhase<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): TypedPhase {
  // Check if container has initialize method and if it's been called
  if ("initialize" in container) {
    // Check for initialization state marker
    const hasAsyncAdapters = "_asyncAdapters" in container || "_asyncPorts" in container;
    if (hasAsyncAdapters) {
      // Container has async adapters - check initialization state
      const isInitialized = "_initialized" in container && container._initialized === true;
      return isInitialized ? "initialized" : "uninitialized";
    }
  }
  // Sync-only containers are immediately initialized
  return "initialized";
}

/**
 * Detects the phase of a lazy container.
 * @internal
 */
function detectLazyPhase<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): TypedPhase {
  // Check for lazy loading state
  if ("_loaded" in container) {
    return container._loaded === true ? "loaded" : "unloaded";
  }
  if ("_loading" in container && container._loading === true) {
    return "loading";
  }
  // Default to unloaded for lazy containers
  return "unloaded";
}

// =============================================================================
// Typed Snapshot Building
// =============================================================================

/**
 * Builds a typed ContainerSnapshot from runtime inspector data.
 *
 * Converts the generic runtime snapshot into a discriminated union type
 * based on the container kind. This enables type-safe consumption in DevTools.
 *
 * @param runtimeSnapshot - The snapshot from createInspector().snapshot()
 * @param kind - The container kind
 * @param container - The container instance for additional state extraction
 * @returns A typed ContainerSnapshot with the correct discriminant
 *
 * @example
 * ```typescript
 * const inspector = createInspector(container);
 * const kind = detectContainerKind(container);
 * const snapshot = buildTypedSnapshot(inspector.snapshot(), kind, container);
 *
 * if (snapshot.kind === "root") {
 *   console.log(`Initialized: ${snapshot.isInitialized}`);
 * }
 * ```
 */
export function buildTypedSnapshot<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  runtimeSnapshot: RuntimeSnapshot,
  kind: ContainerKind,
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): ContainerSnapshot {
  const phase = detectPhase(container, runtimeSnapshot, kind);
  const baseSnapshot = convertToDevToolsSingleton(runtimeSnapshot);

  switch (kind) {
    case "root":
      return buildRootSnapshot(baseSnapshot, phase, container);
    case "child":
      return buildChildSnapshot(baseSnapshot, phase, container);
    case "lazy":
      return buildLazySnapshot(baseSnapshot, phase, container);
    case "scope":
      return buildScopeSnapshot(baseSnapshot, phase, container);
    default:
      // Fallback to root snapshot
      return buildRootSnapshot(baseSnapshot, phase, container);
  }
}

/**
 * Converts runtime SingletonEntry to devtools-core SingletonEntry.
 * @internal
 */
function convertToDevToolsSingleton(runtimeSnapshot: RuntimeSnapshot): {
  singletons: readonly SingletonEntry[];
  scopes: ScopeTree;
  isDisposed: boolean;
  containerName: string;
} {
  const singletons: SingletonEntry[] = runtimeSnapshot.singletons.map(entry => ({
    portName: entry.portName,
    resolvedAt: entry.resolvedAt ?? 0,
    isResolved: entry.isResolved,
  }));

  return {
    singletons: Object.freeze(singletons),
    scopes: runtimeSnapshot.scopes,
    isDisposed: runtimeSnapshot.isDisposed,
    containerName: runtimeSnapshot.containerName,
  };
}

/**
 * Builds a RootContainerSnapshot.
 * @internal
 */
function buildRootSnapshot<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  base: {
    singletons: readonly SingletonEntry[];
    scopes: ScopeTree;
    isDisposed: boolean;
    containerName: string;
  },
  phase: TypedPhase,
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): RootContainerSnapshot {
  // Extract async adapter counts if available
  const asyncInfo = extractAsyncAdapterInfo(container);

  const snapshot: RootContainerSnapshot = {
    kind: "root",
    phase: phase as "uninitialized" | "initialized" | "disposing" | "disposed",
    isInitialized: phase === "initialized",
    asyncAdaptersTotal: asyncInfo.total,
    asyncAdaptersInitialized: asyncInfo.initialized,
    singletons: base.singletons,
    scopes: base.scopes,
    isDisposed: base.isDisposed,
    containerName: base.containerName,
  };

  return Object.freeze(snapshot);
}

/**
 * Builds a ChildContainerSnapshot.
 * @internal
 */
function buildChildSnapshot<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  base: {
    singletons: readonly SingletonEntry[];
    scopes: ScopeTree;
    isDisposed: boolean;
    containerName: string;
  },
  phase: TypedPhase,
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): ChildContainerSnapshot {
  // Extract inheritance modes and parent info
  const inheritanceModes = extractInheritanceModes(container);
  const parentId = extractParentId(container) ?? "unknown";

  const snapshot: ChildContainerSnapshot = {
    kind: "child",
    phase: phase as "initialized" | "disposing" | "disposed",
    parentId,
    inheritanceModes,
    singletons: base.singletons,
    scopes: base.scopes,
    isDisposed: base.isDisposed,
    containerName: base.containerName,
  };

  return Object.freeze(snapshot);
}

/**
 * Builds a LazyContainerSnapshot.
 * @internal
 */
function buildLazySnapshot<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  base: {
    singletons: readonly SingletonEntry[];
    scopes: ScopeTree;
    isDisposed: boolean;
    containerName: string;
  },
  phase: TypedPhase,
  _container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): LazyContainerSnapshot {
  const snapshot: LazyContainerSnapshot = {
    kind: "lazy",
    phase: phase as "unloaded" | "loading" | "loaded" | "disposing" | "disposed",
    isLoaded: phase === "loaded",
    singletons: base.singletons,
    scopes: base.scopes,
    isDisposed: base.isDisposed,
    containerName: base.containerName,
  };

  return Object.freeze(snapshot);
}

/**
 * Builds a ScopeSnapshot.
 * @internal
 */
function buildScopeSnapshot<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  base: {
    singletons: readonly SingletonEntry[];
    scopes: ScopeTree;
    isDisposed: boolean;
    containerName: string;
  },
  phase: TypedPhase,
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): ScopeSnapshot {
  // Extract scope ID and parent scope ID
  const scopeId = extractScopeId(container);
  const parentScopeId = extractParentScopeId(container);

  const snapshot: ScopeSnapshot = {
    kind: "scope",
    phase: phase as "active" | "disposing" | "disposed",
    scopeId,
    parentScopeId,
    singletons: base.singletons,
    scopes: base.scopes,
    isDisposed: base.isDisposed,
    containerName: base.containerName,
  };

  return Object.freeze(snapshot);
}

// =============================================================================
// Extraction Helpers
// =============================================================================

/**
 * Extracts async adapter information from a container.
 * @internal
 */
function extractAsyncAdapterInfo<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): { total: number; initialized: number } {
  // Check for async adapter tracking
  if ("_asyncAdaptersTotal" in container && "_asyncAdaptersInitialized" in container) {
    return {
      total: (container._asyncAdaptersTotal as number) ?? 0,
      initialized: (container._asyncAdaptersInitialized as number) ?? 0,
    };
  }
  return { total: 0, initialized: 0 };
}

/**
 * Extracts the per-port inheritance modes from a child container.
 * @internal
 */
function extractInheritanceModes<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): ReadonlyMap<string, InheritanceMode> {
  // Try to get inheritance modes from container's internal state
  try {
    const internalState = container[INTERNAL_ACCESS]();
    if (internalState.inheritanceModes !== undefined) {
      return internalState.inheritanceModes;
    }
  } catch {
    // Container may not support INTERNAL_ACCESS
  }
  // Return empty map as fallback
  return new Map();
}

/**
 * Extracts the scope ID from a scope container.
 * @internal
 */
function extractScopeId<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): string {
  if ("_scopeId" in container && typeof container._scopeId === "string") {
    return container._scopeId;
  }
  if ("scopeId" in container && typeof container.scopeId === "string") {
    return container.scopeId;
  }
  return "unknown-scope";
}

/**
 * Extracts the parent scope ID from a scope container.
 * @internal
 */
function extractParentScopeId<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): string | null {
  if ("_parentScopeId" in container) {
    const id = container._parentScopeId;
    return typeof id === "string" ? id : null;
  }
  return null;
}
