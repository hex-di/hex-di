/**
 * Helper functions for container kind detection and typed snapshot building.
 *
 * These utilities convert runtime container inspector data into strongly-typed
 * discriminated union snapshots for type-safe consumption.
 *
 * @packageDocumentation
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
  if (stryMutAct_9fa48("1499")) {
    {
    }
  } else {
    stryCov_9fa48("1499");
    const metadata = extractKindMetadata(container);
    if (
      stryMutAct_9fa48("1501")
        ? false
        : stryMutAct_9fa48("1500")
          ? true
          : (stryCov_9fa48("1500", "1501"), metadata.isScope)
    ) {
      if (stryMutAct_9fa48("1502")) {
        {
        }
      } else {
        stryCov_9fa48("1502");
        return stryMutAct_9fa48("1503") ? "" : (stryCov_9fa48("1503"), "scope");
      }
    }
    if (
      stryMutAct_9fa48("1505")
        ? false
        : stryMutAct_9fa48("1504")
          ? true
          : (stryCov_9fa48("1504", "1505"), metadata.isLazy)
    ) {
      if (stryMutAct_9fa48("1506")) {
        {
        }
      } else {
        stryCov_9fa48("1506");
        return stryMutAct_9fa48("1507") ? "" : (stryCov_9fa48("1507"), "lazy");
      }
    }
    if (
      stryMutAct_9fa48("1509")
        ? false
        : stryMutAct_9fa48("1508")
          ? true
          : (stryCov_9fa48("1508", "1509"), metadata.isChild)
    ) {
      if (stryMutAct_9fa48("1510")) {
        {
        }
      } else {
        stryCov_9fa48("1510");
        return stryMutAct_9fa48("1511") ? "" : (stryCov_9fa48("1511"), "child");
      }
    }
    return stryMutAct_9fa48("1512") ? "" : (stryCov_9fa48("1512"), "root");
  }
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
  if (stryMutAct_9fa48("1513")) {
    {
    }
  } else {
    stryCov_9fa48("1513");
    // Check for lazy container markers
    const isLazy = stryMutAct_9fa48("1516")
      ? "load" in container || typeof container.load === "function"
      : stryMutAct_9fa48("1515")
        ? false
        : stryMutAct_9fa48("1514")
          ? true
          : (stryCov_9fa48("1514", "1515", "1516"),
            (stryMutAct_9fa48("1517") ? "" : (stryCov_9fa48("1517"), "load")) in container &&
              (stryMutAct_9fa48("1519")
                ? typeof container.load !== "function"
                : stryMutAct_9fa48("1518")
                  ? true
                  : (stryCov_9fa48("1518", "1519"),
                    typeof container.load ===
                      (stryMutAct_9fa48("1520") ? "" : (stryCov_9fa48("1520"), "function")))));

    // Check for child container markers (has parent reference)
    // Child containers are created with createChild() and share/fork/isolate from parent
    const isChild = stryMutAct_9fa48("1523")
      ? !isLazy || hasParentReference(container)
      : stryMutAct_9fa48("1522")
        ? false
        : stryMutAct_9fa48("1521")
          ? true
          : (stryCov_9fa48("1521", "1522", "1523"),
            (stryMutAct_9fa48("1524") ? isLazy : (stryCov_9fa48("1524"), !isLazy)) &&
              hasParentReference(container));

    // Check for scope markers
    // Scopes are created with createScope() and have a scope ID
    const isScope = hasScopeMarker(container);

    // Extract parent ID if available
    const parentId = extractParentId(container);
    return stryMutAct_9fa48("1525")
      ? {}
      : (stryCov_9fa48("1525"),
        {
          isLazy,
          isChild,
          isScope,
          parentId,
        });
  }
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
  if (stryMutAct_9fa48("1526")) {
    {
    }
  } else {
    stryCov_9fa48("1526");
    // Check for parent property or inherited state marker
    // This is a heuristic - actual implementation depends on container internals
    return stryMutAct_9fa48("1529")
      ? "_parent" in container && "_parentContainer" in container
      : stryMutAct_9fa48("1528")
        ? false
        : stryMutAct_9fa48("1527")
          ? true
          : (stryCov_9fa48("1527", "1528", "1529"),
            (stryMutAct_9fa48("1530") ? "" : (stryCov_9fa48("1530"), "_parent")) in container ||
              (stryMutAct_9fa48("1531") ? "" : (stryCov_9fa48("1531"), "_parentContainer")) in
                container);
  }
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
  if (stryMutAct_9fa48("1532")) {
    {
    }
  } else {
    stryCov_9fa48("1532");
    // Scopes have a scopeId and are created via createScope()
    return stryMutAct_9fa48("1535")
      ? "_scopeId" in container && "scopeId" in container
      : stryMutAct_9fa48("1534")
        ? false
        : stryMutAct_9fa48("1533")
          ? true
          : (stryCov_9fa48("1533", "1534", "1535"),
            (stryMutAct_9fa48("1536") ? "" : (stryCov_9fa48("1536"), "_scopeId")) in container ||
              (stryMutAct_9fa48("1537") ? "" : (stryCov_9fa48("1537"), "scopeId")) in container);
  }
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
  if (stryMutAct_9fa48("1538")) {
    {
    }
  } else {
    stryCov_9fa48("1538");
    // Implementation depends on container internals
    // For now, return null - will be enhanced when container exposes parent info
    return null;
  }
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
  if (stryMutAct_9fa48("1539")) {
    {
    }
  } else {
    stryCov_9fa48("1539");
    // Handle disposed state first (applies to all kinds)
    if (
      stryMutAct_9fa48("1541")
        ? false
        : stryMutAct_9fa48("1540")
          ? true
          : (stryCov_9fa48("1540", "1541"), runtimeSnapshot.isDisposed)
    ) {
      if (stryMutAct_9fa48("1542")) {
        {
        }
      } else {
        stryCov_9fa48("1542");
        return stryMutAct_9fa48("1543") ? "" : (stryCov_9fa48("1543"), "disposed");
      }
    }
    switch (kind) {
      case stryMutAct_9fa48("1545") ? "" : (stryCov_9fa48("1545"), "root"):
        if (stryMutAct_9fa48("1544")) {
        } else {
          stryCov_9fa48("1544");
          return detectRootPhase(container);
        }
      case stryMutAct_9fa48("1547") ? "" : (stryCov_9fa48("1547"), "child"):
        if (stryMutAct_9fa48("1546")) {
        } else {
          stryCov_9fa48("1546");
          return stryMutAct_9fa48("1548") ? "" : (stryCov_9fa48("1548"), "initialized");
        }
      // Child containers are always initialized on creation
      case stryMutAct_9fa48("1550") ? "" : (stryCov_9fa48("1550"), "lazy"):
        if (stryMutAct_9fa48("1549")) {
        } else {
          stryCov_9fa48("1549");
          return detectLazyPhase(container);
        }
      case stryMutAct_9fa48("1552") ? "" : (stryCov_9fa48("1552"), "scope"):
        if (stryMutAct_9fa48("1551")) {
        } else {
          stryCov_9fa48("1551");
          return stryMutAct_9fa48("1553") ? "" : (stryCov_9fa48("1553"), "active");
        }
      // Scopes are active until disposed
      default:
        if (stryMutAct_9fa48("1554")) {
        } else {
          stryCov_9fa48("1554");
          return stryMutAct_9fa48("1555") ? "" : (stryCov_9fa48("1555"), "initialized");
        }
    }
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
  if (stryMutAct_9fa48("1556")) {
    {
    }
  } else {
    stryCov_9fa48("1556");
    // Check if container has initialize method and if it's been called
    if (
      stryMutAct_9fa48("1558")
        ? false
        : stryMutAct_9fa48("1557")
          ? true
          : (stryCov_9fa48("1557", "1558"),
            (stryMutAct_9fa48("1559") ? "" : (stryCov_9fa48("1559"), "initialize")) in container)
    ) {
      if (stryMutAct_9fa48("1560")) {
        {
        }
      } else {
        stryCov_9fa48("1560");
        // Check for initialization state marker
        const hasAsyncAdapters = stryMutAct_9fa48("1563")
          ? "_asyncAdapters" in container && "_asyncPorts" in container
          : stryMutAct_9fa48("1562")
            ? false
            : stryMutAct_9fa48("1561")
              ? true
              : (stryCov_9fa48("1561", "1562", "1563"),
                (stryMutAct_9fa48("1564") ? "" : (stryCov_9fa48("1564"), "_asyncAdapters")) in
                  container ||
                  (stryMutAct_9fa48("1565") ? "" : (stryCov_9fa48("1565"), "_asyncPorts")) in
                    container);
        if (
          stryMutAct_9fa48("1567")
            ? false
            : stryMutAct_9fa48("1566")
              ? true
              : (stryCov_9fa48("1566", "1567"), hasAsyncAdapters)
        ) {
          if (stryMutAct_9fa48("1568")) {
            {
            }
          } else {
            stryCov_9fa48("1568");
            // Container has async adapters - check initialization state
            const isInitialized = stryMutAct_9fa48("1571")
              ? "_initialized" in container || container._initialized === true
              : stryMutAct_9fa48("1570")
                ? false
                : stryMutAct_9fa48("1569")
                  ? true
                  : (stryCov_9fa48("1569", "1570", "1571"),
                    (stryMutAct_9fa48("1572") ? "" : (stryCov_9fa48("1572"), "_initialized")) in
                      container &&
                      (stryMutAct_9fa48("1574")
                        ? container._initialized !== true
                        : stryMutAct_9fa48("1573")
                          ? true
                          : (stryCov_9fa48("1573", "1574"),
                            container._initialized ===
                              (stryMutAct_9fa48("1575") ? false : (stryCov_9fa48("1575"), true)))));
            return isInitialized
              ? stryMutAct_9fa48("1576")
                ? ""
                : (stryCov_9fa48("1576"), "initialized")
              : stryMutAct_9fa48("1577")
                ? ""
                : (stryCov_9fa48("1577"), "uninitialized");
          }
        }
      }
    }
    // Sync-only containers are immediately initialized
    return stryMutAct_9fa48("1578") ? "" : (stryCov_9fa48("1578"), "initialized");
  }
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
  if (stryMutAct_9fa48("1579")) {
    {
    }
  } else {
    stryCov_9fa48("1579");
    // Check for lazy loading state
    if (
      stryMutAct_9fa48("1581")
        ? false
        : stryMutAct_9fa48("1580")
          ? true
          : (stryCov_9fa48("1580", "1581"),
            (stryMutAct_9fa48("1582") ? "" : (stryCov_9fa48("1582"), "_loaded")) in container)
    ) {
      if (stryMutAct_9fa48("1583")) {
        {
        }
      } else {
        stryCov_9fa48("1583");
        return (
          stryMutAct_9fa48("1586")
            ? container._loaded !== true
            : stryMutAct_9fa48("1585")
              ? false
              : stryMutAct_9fa48("1584")
                ? true
                : (stryCov_9fa48("1584", "1585", "1586"),
                  container._loaded ===
                    (stryMutAct_9fa48("1587") ? false : (stryCov_9fa48("1587"), true)))
        )
          ? stryMutAct_9fa48("1588")
            ? ""
            : (stryCov_9fa48("1588"), "loaded")
          : stryMutAct_9fa48("1589")
            ? ""
            : (stryCov_9fa48("1589"), "unloaded");
      }
    }
    if (
      stryMutAct_9fa48("1592")
        ? "_loading" in container || container._loading === true
        : stryMutAct_9fa48("1591")
          ? false
          : stryMutAct_9fa48("1590")
            ? true
            : (stryCov_9fa48("1590", "1591", "1592"),
              (stryMutAct_9fa48("1593") ? "" : (stryCov_9fa48("1593"), "_loading")) in container &&
                (stryMutAct_9fa48("1595")
                  ? container._loading !== true
                  : stryMutAct_9fa48("1594")
                    ? true
                    : (stryCov_9fa48("1594", "1595"),
                      container._loading ===
                        (stryMutAct_9fa48("1596") ? false : (stryCov_9fa48("1596"), true)))))
    ) {
      if (stryMutAct_9fa48("1597")) {
        {
        }
      } else {
        stryCov_9fa48("1597");
        return stryMutAct_9fa48("1598") ? "" : (stryCov_9fa48("1598"), "loading");
      }
    }
    // Default to unloaded for lazy containers
    return stryMutAct_9fa48("1599") ? "" : (stryCov_9fa48("1599"), "unloaded");
  }
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
  if (stryMutAct_9fa48("1600")) {
    {
    }
  } else {
    stryCov_9fa48("1600");
    const phase = detectPhase(container, runtimeSnapshot, kind);
    const baseSnapshot = convertToDevToolsSingleton(runtimeSnapshot);
    switch (kind) {
      case stryMutAct_9fa48("1602") ? "" : (stryCov_9fa48("1602"), "root"):
        if (stryMutAct_9fa48("1601")) {
        } else {
          stryCov_9fa48("1601");
          return buildRootSnapshot(baseSnapshot, phase, container);
        }
      case stryMutAct_9fa48("1604") ? "" : (stryCov_9fa48("1604"), "child"):
        if (stryMutAct_9fa48("1603")) {
        } else {
          stryCov_9fa48("1603");
          return buildChildSnapshot(baseSnapshot, phase, container);
        }
      case stryMutAct_9fa48("1606") ? "" : (stryCov_9fa48("1606"), "lazy"):
        if (stryMutAct_9fa48("1605")) {
        } else {
          stryCov_9fa48("1605");
          return buildLazySnapshot(baseSnapshot, phase, container);
        }
      case stryMutAct_9fa48("1608") ? "" : (stryCov_9fa48("1608"), "scope"):
        if (stryMutAct_9fa48("1607")) {
        } else {
          stryCov_9fa48("1607");
          return buildScopeSnapshot(baseSnapshot, phase, container);
        }
      default:
        if (stryMutAct_9fa48("1609")) {
        } else {
          stryCov_9fa48("1609");
          // Fallback to root snapshot
          return buildRootSnapshot(baseSnapshot, phase, container);
        }
    }
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
  if (stryMutAct_9fa48("1610")) {
    {
    }
  } else {
    stryCov_9fa48("1610");
    const singletons: SingletonEntry[] = runtimeSnapshot.singletons.map(
      stryMutAct_9fa48("1611")
        ? () => undefined
        : (stryCov_9fa48("1611"),
          entry =>
            stryMutAct_9fa48("1612")
              ? {}
              : (stryCov_9fa48("1612"),
                {
                  portName: entry.portName,
                  resolvedAt: stryMutAct_9fa48("1613")
                    ? entry.resolvedAt && 0
                    : (stryCov_9fa48("1613"), entry.resolvedAt ?? 0),
                  isResolved: entry.isResolved,
                }))
    );
    return stryMutAct_9fa48("1614")
      ? {}
      : (stryCov_9fa48("1614"),
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
  if (stryMutAct_9fa48("1615")) {
    {
    }
  } else {
    stryCov_9fa48("1615");
    // Extract async adapter counts if available
    const asyncInfo = extractAsyncAdapterInfo(container);
    const snapshot: RootContainerSnapshot = stryMutAct_9fa48("1616")
      ? {}
      : (stryCov_9fa48("1616"),
        {
          kind: stryMutAct_9fa48("1617") ? "" : (stryCov_9fa48("1617"), "root"),
          phase: phase as "uninitialized" | "initialized" | "disposing" | "disposed",
          isInitialized: stryMutAct_9fa48("1620")
            ? phase !== "initialized"
            : stryMutAct_9fa48("1619")
              ? false
              : stryMutAct_9fa48("1618")
                ? true
                : (stryCov_9fa48("1618", "1619", "1620"),
                  phase ===
                    (stryMutAct_9fa48("1621") ? "" : (stryCov_9fa48("1621"), "initialized"))),
          asyncAdaptersTotal: asyncInfo.total,
          asyncAdaptersInitialized: asyncInfo.initialized,
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
  if (stryMutAct_9fa48("1622")) {
    {
    }
  } else {
    stryCov_9fa48("1622");
    // Extract inheritance modes and parent info
    const inheritanceModes = extractInheritanceModes(container);
    const parentId = stryMutAct_9fa48("1623")
      ? extractParentId(container) && "unknown"
      : (stryCov_9fa48("1623"),
        extractParentId(container) ??
          (stryMutAct_9fa48("1624") ? "" : (stryCov_9fa48("1624"), "unknown")));
    const snapshot: ChildContainerSnapshot = stryMutAct_9fa48("1625")
      ? {}
      : (stryCov_9fa48("1625"),
        {
          kind: stryMutAct_9fa48("1626") ? "" : (stryCov_9fa48("1626"), "child"),
          phase: phase as "initialized" | "disposing" | "disposed",
          parentId,
          inheritanceModes,
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
  if (stryMutAct_9fa48("1627")) {
    {
    }
  } else {
    stryCov_9fa48("1627");
    const snapshot: LazyContainerSnapshot = stryMutAct_9fa48("1628")
      ? {}
      : (stryCov_9fa48("1628"),
        {
          kind: stryMutAct_9fa48("1629") ? "" : (stryCov_9fa48("1629"), "lazy"),
          phase: phase as "unloaded" | "loading" | "loaded" | "disposing" | "disposed",
          isLoaded: stryMutAct_9fa48("1632")
            ? phase !== "loaded"
            : stryMutAct_9fa48("1631")
              ? false
              : stryMutAct_9fa48("1630")
                ? true
                : (stryCov_9fa48("1630", "1631", "1632"),
                  phase === (stryMutAct_9fa48("1633") ? "" : (stryCov_9fa48("1633"), "loaded"))),
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
  if (stryMutAct_9fa48("1634")) {
    {
    }
  } else {
    stryCov_9fa48("1634");
    // Extract scope ID and parent scope ID
    const scopeId = extractScopeId(container);
    const parentScopeId = extractParentScopeId(container);
    const snapshot: ScopeSnapshot = stryMutAct_9fa48("1635")
      ? {}
      : (stryCov_9fa48("1635"),
        {
          kind: stryMutAct_9fa48("1636") ? "" : (stryCov_9fa48("1636"), "scope"),
          phase: phase as "active" | "disposing" | "disposed",
          scopeId,
          parentScopeId,
          singletons: base.singletons,
          scopes: base.scopes,
          isDisposed: base.isDisposed,
          containerName: base.containerName,
        });
    return Object.freeze(snapshot);
  }
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
): {
  total: number;
  initialized: number;
} {
  if (stryMutAct_9fa48("1637")) {
    {
    }
  } else {
    stryCov_9fa48("1637");
    // Check for async adapter tracking
    if (
      stryMutAct_9fa48("1640")
        ? "_asyncAdaptersTotal" in container || "_asyncAdaptersInitialized" in container
        : stryMutAct_9fa48("1639")
          ? false
          : stryMutAct_9fa48("1638")
            ? true
            : (stryCov_9fa48("1638", "1639", "1640"),
              (stryMutAct_9fa48("1641") ? "" : (stryCov_9fa48("1641"), "_asyncAdaptersTotal")) in
                container &&
                (stryMutAct_9fa48("1642")
                  ? ""
                  : (stryCov_9fa48("1642"), "_asyncAdaptersInitialized")) in container)
    ) {
      if (stryMutAct_9fa48("1643")) {
        {
        }
      } else {
        stryCov_9fa48("1643");
        return stryMutAct_9fa48("1644")
          ? {}
          : (stryCov_9fa48("1644"),
            {
              total: stryMutAct_9fa48("1645")
                ? (container._asyncAdaptersTotal as number) && 0
                : (stryCov_9fa48("1645"), (container._asyncAdaptersTotal as number) ?? 0),
              initialized: stryMutAct_9fa48("1646")
                ? (container._asyncAdaptersInitialized as number) && 0
                : (stryCov_9fa48("1646"), (container._asyncAdaptersInitialized as number) ?? 0),
            });
      }
    }
    return stryMutAct_9fa48("1647")
      ? {}
      : (stryCov_9fa48("1647"),
        {
          total: 0,
          initialized: 0,
        });
  }
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
  if (stryMutAct_9fa48("1648")) {
    {
    }
  } else {
    stryCov_9fa48("1648");
    // Try to get inheritance modes from container's internal state
    try {
      if (stryMutAct_9fa48("1649")) {
        {
        }
      } else {
        stryCov_9fa48("1649");
        const internalState = container[INTERNAL_ACCESS]();
        if (
          stryMutAct_9fa48("1652")
            ? internalState.inheritanceModes === undefined
            : stryMutAct_9fa48("1651")
              ? false
              : stryMutAct_9fa48("1650")
                ? true
                : (stryCov_9fa48("1650", "1651", "1652"),
                  internalState.inheritanceModes !== undefined)
        ) {
          if (stryMutAct_9fa48("1653")) {
            {
            }
          } else {
            stryCov_9fa48("1653");
            return internalState.inheritanceModes;
          }
        }
      }
    } catch {
      // Container may not support INTERNAL_ACCESS
    }
    // Return empty map as fallback
    return new Map();
  }
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
  if (stryMutAct_9fa48("1654")) {
    {
    }
  } else {
    stryCov_9fa48("1654");
    if (
      stryMutAct_9fa48("1657")
        ? "_scopeId" in container || typeof container._scopeId === "string"
        : stryMutAct_9fa48("1656")
          ? false
          : stryMutAct_9fa48("1655")
            ? true
            : (stryCov_9fa48("1655", "1656", "1657"),
              (stryMutAct_9fa48("1658") ? "" : (stryCov_9fa48("1658"), "_scopeId")) in container &&
                (stryMutAct_9fa48("1660")
                  ? typeof container._scopeId !== "string"
                  : stryMutAct_9fa48("1659")
                    ? true
                    : (stryCov_9fa48("1659", "1660"),
                      typeof container._scopeId ===
                        (stryMutAct_9fa48("1661") ? "" : (stryCov_9fa48("1661"), "string")))))
    ) {
      if (stryMutAct_9fa48("1662")) {
        {
        }
      } else {
        stryCov_9fa48("1662");
        return container._scopeId;
      }
    }
    if (
      stryMutAct_9fa48("1665")
        ? "scopeId" in container || typeof container.scopeId === "string"
        : stryMutAct_9fa48("1664")
          ? false
          : stryMutAct_9fa48("1663")
            ? true
            : (stryCov_9fa48("1663", "1664", "1665"),
              (stryMutAct_9fa48("1666") ? "" : (stryCov_9fa48("1666"), "scopeId")) in container &&
                (stryMutAct_9fa48("1668")
                  ? typeof container.scopeId !== "string"
                  : stryMutAct_9fa48("1667")
                    ? true
                    : (stryCov_9fa48("1667", "1668"),
                      typeof container.scopeId ===
                        (stryMutAct_9fa48("1669") ? "" : (stryCov_9fa48("1669"), "string")))))
    ) {
      if (stryMutAct_9fa48("1670")) {
        {
        }
      } else {
        stryCov_9fa48("1670");
        return container.scopeId;
      }
    }
    return stryMutAct_9fa48("1671") ? "" : (stryCov_9fa48("1671"), "unknown-scope");
  }
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
  if (stryMutAct_9fa48("1672")) {
    {
    }
  } else {
    stryCov_9fa48("1672");
    if (
      stryMutAct_9fa48("1674")
        ? false
        : stryMutAct_9fa48("1673")
          ? true
          : (stryCov_9fa48("1673", "1674"),
            (stryMutAct_9fa48("1675") ? "" : (stryCov_9fa48("1675"), "_parentScopeId")) in
              container)
    ) {
      if (stryMutAct_9fa48("1676")) {
        {
        }
      } else {
        stryCov_9fa48("1676");
        const id = container._parentScopeId;
        return (
          stryMutAct_9fa48("1679")
            ? typeof id !== "string"
            : stryMutAct_9fa48("1678")
              ? false
              : stryMutAct_9fa48("1677")
                ? true
                : (stryCov_9fa48("1677", "1678", "1679"),
                  typeof id === (stryMutAct_9fa48("1680") ? "" : (stryCov_9fa48("1680"), "string")))
        )
          ? id
          : null;
      }
    }
    return null;
  }
}
