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
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  if (stryMutAct_9fa48("1681")) {
    {
    }
  } else {
    stryCov_9fa48("1681");
    // Child containers have inheritanceModes (always set, even if empty Map)
    // parentState is intentionally omitted from child containers to avoid circular refs
    if (
      stryMutAct_9fa48("1684")
        ? internalState.inheritanceModes === undefined
        : stryMutAct_9fa48("1683")
          ? false
          : stryMutAct_9fa48("1682")
            ? true
            : (stryCov_9fa48("1682", "1683", "1684"), internalState.inheritanceModes !== undefined)
    ) {
      if (stryMutAct_9fa48("1685")) {
        {
        }
      } else {
        stryCov_9fa48("1685");
        return stryMutAct_9fa48("1686") ? "" : (stryCov_9fa48("1686"), "child");
      }
    }

    // Default to root
    return stryMutAct_9fa48("1687") ? "" : (stryCov_9fa48("1687"), "root");
  }
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
  if (stryMutAct_9fa48("1688")) {
    {
    }
  } else {
    stryCov_9fa48("1688");
    if (
      stryMutAct_9fa48("1690")
        ? false
        : stryMutAct_9fa48("1689")
          ? true
          : (stryCov_9fa48("1689", "1690"), snapshot.isDisposed)
    ) {
      if (stryMutAct_9fa48("1691")) {
        {
        }
      } else {
        stryCov_9fa48("1691");
        return stryMutAct_9fa48("1692") ? "" : (stryCov_9fa48("1692"), "disposed");
      }
    }
    switch (kind) {
      case stryMutAct_9fa48("1694") ? "" : (stryCov_9fa48("1694"), "root"):
        if (stryMutAct_9fa48("1693")) {
        } else {
          stryCov_9fa48("1693");
          return stryMutAct_9fa48("1695") ? "" : (stryCov_9fa48("1695"), "initialized");
        }
      case stryMutAct_9fa48("1697") ? "" : (stryCov_9fa48("1697"), "child"):
        if (stryMutAct_9fa48("1696")) {
        } else {
          stryCov_9fa48("1696");
          return stryMutAct_9fa48("1698") ? "" : (stryCov_9fa48("1698"), "initialized");
        }
      case stryMutAct_9fa48("1700") ? "" : (stryCov_9fa48("1700"), "lazy"):
        if (stryMutAct_9fa48("1699")) {
        } else {
          stryCov_9fa48("1699");
          return stryMutAct_9fa48("1701") ? "" : (stryCov_9fa48("1701"), "loaded");
        }
      case stryMutAct_9fa48("1703") ? "" : (stryCov_9fa48("1703"), "scope"):
        if (stryMutAct_9fa48("1702")) {
        } else {
          stryCov_9fa48("1702");
          return stryMutAct_9fa48("1704") ? "" : (stryCov_9fa48("1704"), "active");
        }
      default:
        if (stryMutAct_9fa48("1705")) {
        } else {
          stryCov_9fa48("1705");
          return stryMutAct_9fa48("1706") ? "" : (stryCov_9fa48("1706"), "initialized");
        }
    }
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
  if (stryMutAct_9fa48("1707")) {
    {
    }
  } else {
    stryCov_9fa48("1707");
    const phase = detectPhaseFromSnapshot(runtimeSnapshot, kind);
    const base = convertToDevToolsSingleton(runtimeSnapshot);
    switch (kind) {
      case stryMutAct_9fa48("1709") ? "" : (stryCov_9fa48("1709"), "root"):
        if (stryMutAct_9fa48("1708")) {
        } else {
          stryCov_9fa48("1708");
          return buildRootSnapshot(base, phase);
        }
      case stryMutAct_9fa48("1711") ? "" : (stryCov_9fa48("1711"), "child"):
        if (stryMutAct_9fa48("1710")) {
        } else {
          stryCov_9fa48("1710");
          return buildChildSnapshot(base, phase);
        }
      case stryMutAct_9fa48("1713") ? "" : (stryCov_9fa48("1713"), "lazy"):
        if (stryMutAct_9fa48("1712")) {
        } else {
          stryCov_9fa48("1712");
          return buildLazySnapshot(base, phase);
        }
      case stryMutAct_9fa48("1715") ? "" : (stryCov_9fa48("1715"), "scope"):
        if (stryMutAct_9fa48("1714")) {
        } else {
          stryCov_9fa48("1714");
          return buildScopeSnapshot(base, phase, runtimeSnapshot.scopes.id);
        }
      default:
        if (stryMutAct_9fa48("1716")) {
        } else {
          stryCov_9fa48("1716");
          return buildRootSnapshot(base, phase);
        }
    }
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
  if (stryMutAct_9fa48("1717")) {
    {
    }
  } else {
    stryCov_9fa48("1717");
    const singletons: SingletonEntry[] = runtimeSnapshot.singletons.map(
      stryMutAct_9fa48("1718")
        ? () => undefined
        : (stryCov_9fa48("1718"),
          entry =>
            stryMutAct_9fa48("1719")
              ? {}
              : (stryCov_9fa48("1719"),
                {
                  portName: entry.portName,
                  resolvedAt: stryMutAct_9fa48("1720")
                    ? entry.resolvedAt && 0
                    : (stryCov_9fa48("1720"), entry.resolvedAt ?? 0),
                  isResolved: entry.isResolved,
                }))
    );
    return stryMutAct_9fa48("1721")
      ? {}
      : (stryCov_9fa48("1721"),
        {
          singletons: Object.freeze(singletons),
          scopes: runtimeSnapshot.scopes,
          isDisposed: runtimeSnapshot.isDisposed,
          containerName: runtimeSnapshot.containerName,
        });
  }
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
  if (stryMutAct_9fa48("1722")) {
    {
    }
  } else {
    stryCov_9fa48("1722");
    const snapshot: RootContainerSnapshot = stryMutAct_9fa48("1723")
      ? {}
      : (stryCov_9fa48("1723"),
        {
          kind: stryMutAct_9fa48("1724") ? "" : (stryCov_9fa48("1724"), "root"),
          phase: phase as "uninitialized" | "initialized" | "disposing" | "disposed",
          isInitialized: stryMutAct_9fa48("1727")
            ? phase !== "initialized"
            : stryMutAct_9fa48("1726")
              ? false
              : stryMutAct_9fa48("1725")
                ? true
                : (stryCov_9fa48("1725", "1726", "1727"),
                  phase ===
                    (stryMutAct_9fa48("1728") ? "" : (stryCov_9fa48("1728"), "initialized"))),
          asyncAdaptersTotal: 0,
          asyncAdaptersInitialized: 0,
          singletons: base.singletons,
          scopes: base.scopes,
          isDisposed: base.isDisposed,
          containerName: base.containerName,
        });
    return Object.freeze(snapshot);
  }
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
  if (stryMutAct_9fa48("1729")) {
    {
    }
  } else {
    stryCov_9fa48("1729");
    const snapshot: ChildContainerSnapshot = stryMutAct_9fa48("1730")
      ? {}
      : (stryCov_9fa48("1730"),
        {
          kind: stryMutAct_9fa48("1731") ? "" : (stryCov_9fa48("1731"), "child"),
          phase: phase as "initialized" | "disposing" | "disposed",
          parentId: stryMutAct_9fa48("1732") ? "" : (stryCov_9fa48("1732"), "unknown"),
          inheritanceModes: new Map(),
          singletons: base.singletons,
          scopes: base.scopes,
          isDisposed: base.isDisposed,
          containerName: base.containerName,
        });
    return Object.freeze(snapshot);
  }
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
  if (stryMutAct_9fa48("1733")) {
    {
    }
  } else {
    stryCov_9fa48("1733");
    const snapshot: LazyContainerSnapshot = stryMutAct_9fa48("1734")
      ? {}
      : (stryCov_9fa48("1734"),
        {
          kind: stryMutAct_9fa48("1735") ? "" : (stryCov_9fa48("1735"), "lazy"),
          phase: phase as "unloaded" | "loading" | "loaded" | "disposing" | "disposed",
          isLoaded: stryMutAct_9fa48("1738")
            ? phase !== "loaded"
            : stryMutAct_9fa48("1737")
              ? false
              : stryMutAct_9fa48("1736")
                ? true
                : (stryCov_9fa48("1736", "1737", "1738"),
                  phase === (stryMutAct_9fa48("1739") ? "" : (stryCov_9fa48("1739"), "loaded"))),
          singletons: base.singletons,
          scopes: base.scopes,
          isDisposed: base.isDisposed,
          containerName: base.containerName,
        });
    return Object.freeze(snapshot);
  }
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
  if (stryMutAct_9fa48("1740")) {
    {
    }
  } else {
    stryCov_9fa48("1740");
    const snapshot: ScopeSnapshot = stryMutAct_9fa48("1741")
      ? {}
      : (stryCov_9fa48("1741"),
        {
          kind: stryMutAct_9fa48("1742") ? "" : (stryCov_9fa48("1742"), "scope"),
          phase: phase as "active" | "disposing" | "disposed",
          scopeId,
          parentScopeId: null,
          singletons: base.singletons,
          scopes: base.scopes,
          isDisposed: base.isDisposed,
          containerName: base.containerName,
        });
    return Object.freeze(snapshot);
  }
}
