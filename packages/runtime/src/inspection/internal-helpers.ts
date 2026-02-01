/**
 * Internal helpers for inspector creation from InternalAccessible.
 *
 * These helpers work with the minimal InternalAccessible interface,
 * which provides access to container internals without requiring
 * the full Container type.
 *
 * @packageDocumentation
 * @internal
 */

import type {
  ContainerInternalState,
  ContainerSnapshot as RuntimeSnapshot,
} from "./internal-state-types.js";
import type {
  ContainerKind,
  ContainerPhase,
  ContainerSnapshot,
  RootContainerSnapshot,
  ChildContainerSnapshot,
  LazyContainerSnapshot,
  ScopeSnapshot,
  ScopeTree,
  SingletonEntry,
} from "@hex-di/core";

// =============================================================================
// Container Kind Detection
// =============================================================================

/**
 * Detects container kind from internal state.
 *
 * Uses heuristics based on the internal state structure:
 * - child: Has inheritanceModes (set by ChildContainerImpl.getInternalState)
 * - root: No inheritanceModes
 * - scope: Has scopedMemo as primary indicator
 *
 * Note: parentState is intentionally NOT used for detection because
 * child containers omit parentState to avoid circular references.
 * Instead, we use inheritanceModes which is only present on child containers.
 *
 * Note: Lazy containers are not currently detected by this function.
 * Lazy container detection would require loading state to be present
 * in ContainerInternalState, which is not currently exposed. Lazy
 * containers created via `createLazyContainer` are tracked separately
 * by the runtime's LazyContainer wrapper, not through internal state.
 * As a result, lazy containers will be detected as "root" containers.
 *
 * @param internalState - The container's internal state
 * @returns Detected container kind
 *
 * @internal
 */
export function detectContainerKindFromInternal(
  internalState: ContainerInternalState
): ContainerKind {
  // Child containers have inheritanceModes (always set, even if empty Map)
  // parentState is intentionally omitted from child containers to avoid circular refs
  if (internalState.inheritanceModes !== undefined) {
    return "child";
  }

  // Default to root
  return "root";
}

// =============================================================================
// Phase Detection
// =============================================================================

/**
 * Detects container phase from snapshot and kind.
 *
 * @param snapshot - The runtime snapshot
 * @param kind - The container kind
 * @returns The detected phase
 *
 * @internal
 */
export function detectPhaseFromSnapshot(
  snapshot: RuntimeSnapshot,
  kind: ContainerKind
): ContainerPhase {
  if (snapshot.isDisposed) {
    return "disposed";
  }

  switch (kind) {
    case "root":
      return "initialized";
    case "child":
      return "initialized";
    case "lazy":
      return "loaded";
    case "scope":
      return "active";
    default:
      return "initialized";
  }
}

// =============================================================================
// Typed Snapshot Building
// =============================================================================

/**
 * Builds typed snapshot from runtime snapshot and internal state.
 *
 * @param runtimeSnapshot - The snapshot from runtime inspector
 * @param kind - The container kind
 * @param internalState - The container's internal state
 * @returns Typed ContainerSnapshot discriminated union
 *
 * @internal
 */
export function buildTypedSnapshotFromInternal(
  runtimeSnapshot: RuntimeSnapshot,
  kind: ContainerKind,
  _internalState: ContainerInternalState
): ContainerSnapshot {
  const phase = detectPhaseFromSnapshot(runtimeSnapshot, kind);
  const base = convertToDevToolsSingleton(runtimeSnapshot);

  switch (kind) {
    case "root":
      return buildRootSnapshot(base, phase);
    case "child":
      return buildChildSnapshot(base, phase);
    case "lazy":
      return buildLazySnapshot(base, phase);
    case "scope":
      return buildScopeSnapshot(base, phase, runtimeSnapshot.scopes.id);
    default:
      return buildRootSnapshot(base, phase);
  }
}

/**
 * Converts runtime singleton entries to devtools-core format.
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
function buildRootSnapshot(
  base: {
    singletons: readonly SingletonEntry[];
    scopes: ScopeTree;
    isDisposed: boolean;
    containerName: string;
  },
  phase: ContainerPhase
): RootContainerSnapshot {
  const snapshot: RootContainerSnapshot = {
    kind: "root",
    phase: phase as "uninitialized" | "initialized" | "disposing" | "disposed",
    isInitialized: phase === "initialized",
    asyncAdaptersTotal: 0,
    asyncAdaptersInitialized: 0,
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
function buildChildSnapshot(
  base: {
    singletons: readonly SingletonEntry[];
    scopes: ScopeTree;
    isDisposed: boolean;
    containerName: string;
  },
  phase: ContainerPhase
): ChildContainerSnapshot {
  const snapshot: ChildContainerSnapshot = {
    kind: "child",
    phase: phase as "initialized" | "disposing" | "disposed",
    parentId: "unknown",
    inheritanceModes: new Map(),
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
function buildLazySnapshot(
  base: {
    singletons: readonly SingletonEntry[];
    scopes: ScopeTree;
    isDisposed: boolean;
    containerName: string;
  },
  phase: ContainerPhase
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
function buildScopeSnapshot(
  base: {
    singletons: readonly SingletonEntry[];
    scopes: ScopeTree;
    isDisposed: boolean;
    containerName: string;
  },
  phase: ContainerPhase,
  scopeId: string
): ScopeSnapshot {
  const snapshot: ScopeSnapshot = {
    kind: "scope",
    phase: phase as "active" | "disposing" | "disposed",
    scopeId,
    parentScopeId: null,
    singletons: base.singletons,
    scopes: base.scopes,
    isDisposed: base.isDisposed,
    containerName: base.containerName,
  };

  return Object.freeze(snapshot);
}
