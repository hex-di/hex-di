/**
 * Container inspector factory for @hex-di/runtime.
 *
 * The inspector provides runtime state inspection capabilities for DevTools
 * and debugging purposes. It uses the INTERNAL_ACCESS Symbol protocol to
 * read container internals without exposing mutable state.
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
import type { Port } from "@hex-di/core";
import type { Container, ContainerPhase } from "../types.js";
import { INTERNAL_ACCESS } from "./symbols.js";
import type {
  ContainerInternalState,
  ScopeInternalState,
  ContainerInspector,
  AdapterInfo,
  ContainerSnapshot,
  ScopeTree,
  SingletonEntry,
  MemoEntrySnapshot,
} from "./internal-state-types.js";
import { isRecord } from "../util/type-guards.js";
import { suggestSimilarPort } from "../util/string-similarity.js";

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ContainerInspector, ContainerSnapshot, SingletonEntry, ScopeTree };

// =============================================================================
// Internal Access Helper
// =============================================================================

/**
 * Safely access the internal state accessor from a container.
 *
 * This helper handles the type narrowing for Symbol-indexed properties,
 * providing type-safe access to container internals for DevTools and
 * container wrappers.
 *
 * @param container - The container to access
 * @returns The accessor function that returns frozen internal state
 * @throws Error if the accessor is not found
 *
 * @example
 * ```typescript
 * import { createContainer, getInternalAccessor } from '@hex-di/runtime';
 *
 * const container = createContainer(graph);
 * const accessor = getInternalAccessor(container);
 * const state = accessor(); // ContainerInternalState
 * ```
 */
/**
 * The minimal interface for accessing INTERNAL_ACCESS from a container.
 *
 * This trait-like interface allows getInternalAccessor and createInspector to
 * accept any Container variant without running into variance issues from the
 * Container type's conditional methods.
 *
 * All Container variants satisfy this interface structurally (like impl Trait in Rust).
 * This enables storing heterogeneous containers in DevTools registries.
 */
export interface InternalAccessible {
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
}
export function getInternalAccessor(container: InternalAccessible): () => ContainerInternalState {
  if (stryMutAct_9fa48("1386")) {
    {
    }
  } else {
    stryCov_9fa48("1386");
    // Container type includes [INTERNAL_ACCESS] property
    const accessor = container[INTERNAL_ACCESS];
    if (
      stryMutAct_9fa48("1389")
        ? typeof accessor === "function"
        : stryMutAct_9fa48("1388")
          ? false
          : stryMutAct_9fa48("1387")
            ? true
            : (stryCov_9fa48("1387", "1388", "1389"),
              typeof accessor !==
                (stryMutAct_9fa48("1390") ? "" : (stryCov_9fa48("1390"), "function")))
    ) {
      if (stryMutAct_9fa48("1391")) {
        {
        }
      } else {
        stryCov_9fa48("1391");
        throw new Error(
          stryMutAct_9fa48("1392")
            ? ""
            : (stryCov_9fa48("1392"), "Container does not expose INTERNAL_ACCESS accessor")
        );
      }
    }
    return accessor;
  }
}

/**
 * Deeply freezes an object and all its nested properties.
 *
 * @param obj - The object to freeze
 * @returns The frozen object
 * @internal
 */
function deepFreeze<T>(obj: T): T {
  if (stryMutAct_9fa48("1393")) {
    {
    }
  } else {
    stryCov_9fa48("1393");
    if (
      stryMutAct_9fa48("1396")
        ? false
        : stryMutAct_9fa48("1395")
          ? true
          : stryMutAct_9fa48("1394")
            ? isRecord(obj)
            : (stryCov_9fa48("1394", "1395", "1396"), !isRecord(obj))
    ) {
      if (stryMutAct_9fa48("1397")) {
        {
        }
      } else {
        stryCov_9fa48("1397");
        return obj;
      }
    }

    // Freeze the object itself
    Object.freeze(obj);

    // Recursively freeze nested properties
    for (const key of Object.keys(obj)) {
      if (stryMutAct_9fa48("1398")) {
        {
        }
      } else {
        stryCov_9fa48("1398");
        const value = obj[key];
        if (
          stryMutAct_9fa48("1401")
            ? isRecord(value) || !Object.isFrozen(value)
            : stryMutAct_9fa48("1400")
              ? false
              : stryMutAct_9fa48("1399")
                ? true
                : (stryCov_9fa48("1399", "1400", "1401"),
                  isRecord(value) &&
                    (stryMutAct_9fa48("1402")
                      ? Object.isFrozen(value)
                      : (stryCov_9fa48("1402"), !Object.isFrozen(value))))
        ) {
          if (stryMutAct_9fa48("1403")) {
            {
            }
          } else {
            stryCov_9fa48("1403");
            deepFreeze(value);
          }
        }
      }
    }
    return obj;
  }
}

/**
 * Builds a ScopeTree from scope internal state.
 *
 * @param scopeState - The scope's internal state
 * @param totalCount - Total number of ports in the container
 * @returns A frozen ScopeTree node
 * @internal
 */
function buildScopeTreeNode(scopeState: ScopeInternalState, totalCount: number): ScopeTree {
  if (stryMutAct_9fa48("1404")) {
    {
    }
  } else {
    stryCov_9fa48("1404");
    const children: ScopeTree[] = stryMutAct_9fa48("1405")
      ? ["Stryker was here"]
      : (stryCov_9fa48("1405"), []);
    for (const childState of scopeState.childScopes) {
      if (stryMutAct_9fa48("1406")) {
        {
        }
      } else {
        stryCov_9fa48("1406");
        children.push(buildScopeTreeNode(childState, totalCount));
      }
    }

    // Extract port names from scopedMemo entries
    const resolvedPorts: string[] = stryMutAct_9fa48("1407")
      ? ["Stryker was here"]
      : (stryCov_9fa48("1407"), []);
    for (const entry of scopeState.scopedMemo.entries) {
      if (stryMutAct_9fa48("1408")) {
        {
        }
      } else {
        stryCov_9fa48("1408");
        resolvedPorts.push(entry.portName);
      }
    }
    const node: ScopeTree = stryMutAct_9fa48("1409")
      ? {}
      : (stryCov_9fa48("1409"),
        {
          id: scopeState.id,
          status: scopeState.disposed
            ? stryMutAct_9fa48("1410")
              ? ""
              : (stryCov_9fa48("1410"), "disposed")
            : stryMutAct_9fa48("1411")
              ? ""
              : (stryCov_9fa48("1411"), "active"),
          resolvedCount: scopeState.scopedMemo.size,
          totalCount,
          children: Object.freeze(children),
          resolvedPorts: Object.freeze(resolvedPorts),
        });
    return Object.freeze(node);
  }
}

// =============================================================================
// createInspector Factory
// =============================================================================

/**
 * Creates a container inspector for runtime state inspection.
 *
 * The inspector provides pure functions that return serializable, frozen data
 * about the container's current state. Inspector creation is O(1) - no iteration
 * happens until methods are called.
 *
 * @param container - The container to inspect
 * @returns A frozen ContainerInspector object
 *
 * @example Basic usage
 * ```typescript
 * const container = createContainer(graph);
 * const inspector = createInspector(container);
 *
 * // Get complete snapshot
 * const snapshot = inspector.snapshot();
 * console.log('Disposed:', snapshot.isDisposed);
 * console.log('Singletons:', snapshot.singletons.length);
 *
 * // List all registered ports
 * const ports = inspector.listPorts();
 * console.log('Ports:', ports);
 *
 * // Check resolution status
 * if (inspector.isResolved('Logger')) {
 *   console.log('Logger has been resolved');
 * }
 *
 * // Get scope hierarchy
 * const tree = inspector.getScopeTree();
 * console.log('Root:', tree.id, 'Children:', tree.children.length);
 * ```
 *
 * @throws {Error} If the container doesn't expose INTERNAL_ACCESS
 */
// Overload 1: Full Container type with generics (for type inference)
export function createInspector<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): ContainerInspector;
// Overload 2: Minimal InternalAccessible interface (for DevTools registry)
export function createInspector(container: InternalAccessible): ContainerInspector;
// Implementation
export function createInspector(container: InternalAccessible): ContainerInspector {
  if (stryMutAct_9fa48("1412")) {
    {
    }
  } else {
    stryCov_9fa48("1412");
    // Store container reference for later access - O(1) operation
    const containerRef = container;

    // Get accessor once to validate container, but don't call it yet
    // getInternalAccessor is now generic, so no cast needed
    const getAccessor = stryMutAct_9fa48("1413")
      ? () => undefined
      : (stryCov_9fa48("1413"),
        (() => {
          const getAccessor = () => getInternalAccessor(containerRef);
          return getAccessor;
        })());

    /**
     * Implementation of snapshot() method.
     *
     * Access container internals via INTERNAL_ACCESS Symbol,
     * iterate MemoMap entries for singleton data, build scope tree,
     * and deep freeze the entire result.
     */
    function snapshot(): ContainerSnapshot {
      if (stryMutAct_9fa48("1414")) {
        {
        }
      } else {
        stryCov_9fa48("1414");
        const accessor = getAccessor();
        const state = accessor(); // This throws if disposed

        // Build singleton entries from adapter map
        const singletons: SingletonEntry[] = stryMutAct_9fa48("1415")
          ? ["Stryker was here"]
          : (stryCov_9fa48("1415"), []);
        const resolvedPortNames = new Set<string>();

        // Build a set of resolved port names from the memo entries
        for (const entry of state.singletonMemo.entries) {
          if (stryMutAct_9fa48("1416")) {
            {
            }
          } else {
            stryCov_9fa48("1416");
            resolvedPortNames.add(entry.portName);
          }
        }

        // Create a map of port name to memo entry for lookup
        const memoEntryMap = new Map<string, MemoEntrySnapshot>();
        for (const entry of state.singletonMemo.entries) {
          if (stryMutAct_9fa48("1417")) {
            {
            }
          } else {
            stryCov_9fa48("1417");
            memoEntryMap.set(entry.portName, entry);
          }
        }

        // Build singleton entries from adapter map
        for (const [, adapterInfo] of state.adapterMap) {
          if (stryMutAct_9fa48("1418")) {
            {
            }
          } else {
            stryCov_9fa48("1418");
            if (
              stryMutAct_9fa48("1421")
                ? adapterInfo.lifetime !== "singleton"
                : stryMutAct_9fa48("1420")
                  ? false
                  : stryMutAct_9fa48("1419")
                    ? true
                    : (stryCov_9fa48("1419", "1420", "1421"),
                      adapterInfo.lifetime ===
                        (stryMutAct_9fa48("1422") ? "" : (stryCov_9fa48("1422"), "singleton")))
            ) {
              if (stryMutAct_9fa48("1423")) {
                {
                }
              } else {
                stryCov_9fa48("1423");
                const memoEntry = memoEntryMap.get(adapterInfo.portName);
                const isResolved = resolvedPortNames.has(adapterInfo.portName);
                singletons.push(
                  Object.freeze(
                    stryMutAct_9fa48("1424")
                      ? {}
                      : (stryCov_9fa48("1424"),
                        {
                          portName: adapterInfo.portName,
                          lifetime: adapterInfo.lifetime,
                          isResolved,
                          resolvedAt: (
                            stryMutAct_9fa48("1427")
                              ? isResolved || memoEntry
                              : stryMutAct_9fa48("1426")
                                ? false
                                : stryMutAct_9fa48("1425")
                                  ? true
                                  : (stryCov_9fa48("1425", "1426", "1427"), isResolved && memoEntry)
                          )
                            ? memoEntry.resolvedAt
                            : undefined,
                          resolutionOrder: (
                            stryMutAct_9fa48("1430")
                              ? isResolved || memoEntry
                              : stryMutAct_9fa48("1429")
                                ? false
                                : stryMutAct_9fa48("1428")
                                  ? true
                                  : (stryCov_9fa48("1428", "1429", "1430"), isResolved && memoEntry)
                          )
                            ? memoEntry.resolutionOrder
                            : undefined,
                        })
                  )
                );
              }
            }
          }
        }

        // Build scope tree
        const scopeTree = buildContainerScopeTree(state);
        const result: ContainerSnapshot = stryMutAct_9fa48("1431")
          ? {}
          : (stryCov_9fa48("1431"),
            {
              isDisposed: state.disposed,
              singletons: Object.freeze(singletons),
              scopes: scopeTree,
              containerName: state.containerName,
            });
        return deepFreeze(result);
      }
    }

    /**
     * Builds the root scope tree from container state.
     * Recursively includes scopes from child containers.
     */
    function buildContainerScopeTree(state: ContainerInternalState): ScopeTree {
      if (stryMutAct_9fa48("1432")) {
        {
        }
      } else {
        stryCov_9fa48("1432");
        const totalCount = state.adapterMap.size;

        // Calculate scoped adapter count for child scopes
        // Scopes only cache scoped-lifetime services, so their totalCount
        // should reflect only scoped adapters for semantic consistency
        let scopedAdapterCount = 0;
        for (const adapterInfo of state.adapterMap.values()) {
          if (stryMutAct_9fa48("1433")) {
            {
            }
          } else {
            stryCov_9fa48("1433");
            if (
              stryMutAct_9fa48("1436")
                ? adapterInfo.lifetime !== "scoped"
                : stryMutAct_9fa48("1435")
                  ? false
                  : stryMutAct_9fa48("1434")
                    ? true
                    : (stryCov_9fa48("1434", "1435", "1436"),
                      adapterInfo.lifetime ===
                        (stryMutAct_9fa48("1437") ? "" : (stryCov_9fa48("1437"), "scoped")))
            ) {
              if (stryMutAct_9fa48("1438")) {
                {
                }
              } else {
                stryCov_9fa48("1438");
                stryMutAct_9fa48("1439")
                  ? scopedAdapterCount--
                  : (stryCov_9fa48("1439"), scopedAdapterCount++);
              }
            }
          }
        }
        const children: ScopeTree[] = stryMutAct_9fa48("1440")
          ? ["Stryker was here"]
          : (stryCov_9fa48("1440"), []);

        // Direct child scopes
        for (const childState of state.childScopes) {
          if (stryMutAct_9fa48("1441")) {
            {
            }
          } else {
            stryCov_9fa48("1441");
            children.push(buildScopeTreeNode(childState, scopedAdapterCount));
          }
        }

        // Extract port names from singletonMemo entries for root container
        const resolvedPorts: string[] = stryMutAct_9fa48("1442")
          ? ["Stryker was here"]
          : (stryCov_9fa48("1442"), []);
        for (const entry of state.singletonMemo.entries) {
          if (stryMutAct_9fa48("1443")) {
            {
            }
          } else {
            stryCov_9fa48("1443");
            resolvedPorts.push(entry.portName);
          }
        }
        const root: ScopeTree = stryMutAct_9fa48("1444")
          ? {}
          : (stryCov_9fa48("1444"),
            {
              id: stryMutAct_9fa48("1445") ? "" : (stryCov_9fa48("1445"), "container"),
              status: state.disposed
                ? stryMutAct_9fa48("1446")
                  ? ""
                  : (stryCov_9fa48("1446"), "disposed")
                : stryMutAct_9fa48("1447")
                  ? ""
                  : (stryCov_9fa48("1447"), "active"),
              resolvedCount: state.singletonMemo.size,
              totalCount,
              children: Object.freeze(children),
              resolvedPorts: Object.freeze(resolvedPorts),
            });
        return Object.freeze(root);
      }
    }

    /**
     * Implementation of listPorts() method.
     *
     * Returns all registered port names from adapterMap,
     * sorted alphabetically for consistent ordering.
     */
    function listPorts(): readonly string[] {
      if (stryMutAct_9fa48("1448")) {
        {
        }
      } else {
        stryCov_9fa48("1448");
        const accessor = getAccessor();
        const state = accessor(); // This throws if disposed

        const portNames: string[] = stryMutAct_9fa48("1449")
          ? ["Stryker was here"]
          : (stryCov_9fa48("1449"), []);
        for (const [, adapterInfo] of state.adapterMap) {
          if (stryMutAct_9fa48("1450")) {
            {
            }
          } else {
            stryCov_9fa48("1450");
            portNames.push(adapterInfo.portName);
          }
        }

        // Sort alphabetically
        stryMutAct_9fa48("1451") ? portNames : (stryCov_9fa48("1451"), portNames.sort());
        return Object.freeze(portNames);
      }
    }

    /**
     * Implementation of isResolved() method.
     *
     * Checks singleton memo for resolution status.
     * For child containers, also checks parent's memo for inherited resolutions.
     * Returns "scope-required" for scoped ports.
     * Throws if port name is not registered.
     */
    function isResolved(portName: string): boolean | "scope-required" {
      if (stryMutAct_9fa48("1452")) {
        {
        }
      } else {
        stryCov_9fa48("1452");
        const accessor = getAccessor();
        const state = accessor(); // This throws if disposed

        // Find adapter info by port name
        let adapterInfo: AdapterInfo | undefined;
        for (const [, info] of state.adapterMap) {
          if (stryMutAct_9fa48("1453")) {
            {
            }
          } else {
            stryCov_9fa48("1453");
            if (
              stryMutAct_9fa48("1456")
                ? info.portName !== portName
                : stryMutAct_9fa48("1455")
                  ? false
                  : stryMutAct_9fa48("1454")
                    ? true
                    : (stryCov_9fa48("1454", "1455", "1456"), info.portName === portName)
            ) {
              if (stryMutAct_9fa48("1457")) {
                {
                }
              } else {
                stryCov_9fa48("1457");
                adapterInfo = info;
                break;
              }
            }
          }
        }
        if (
          stryMutAct_9fa48("1460")
            ? adapterInfo !== undefined
            : stryMutAct_9fa48("1459")
              ? false
              : stryMutAct_9fa48("1458")
                ? true
                : (stryCov_9fa48("1458", "1459", "1460"), adapterInfo === undefined)
        ) {
          if (stryMutAct_9fa48("1461")) {
            {
            }
          } else {
            stryCov_9fa48("1461");
            // Collect all available port names for suggestion
            const availablePorts: string[] = stryMutAct_9fa48("1462")
              ? ["Stryker was here"]
              : (stryCov_9fa48("1462"), []);
            for (const [, info] of state.adapterMap) {
              if (stryMutAct_9fa48("1463")) {
                {
                }
              } else {
                stryCov_9fa48("1463");
                availablePorts.push(info.portName);
              }
            }

            // Try to suggest a similar port name
            const suggestion = suggestSimilarPort(portName, availablePorts);
            const didYouMean = suggestion
              ? stryMutAct_9fa48("1464")
                ? ``
                : (stryCov_9fa48("1464"), ` Did you mean '${suggestion}'?`)
              : stryMutAct_9fa48("1465")
                ? "Stryker was here!"
                : (stryCov_9fa48("1465"), "");
            throw new Error(
              (stryMutAct_9fa48("1466")
                ? ``
                : (stryCov_9fa48("1466"),
                  `Port '${portName}' is not registered in this container.${didYouMean} `)) +
                (stryMutAct_9fa48("1467")
                  ? ``
                  : (stryCov_9fa48("1467"), `Use listPorts() to see available ports.`))
            );
          }
        }

        // Handle scoped ports
        if (
          stryMutAct_9fa48("1470")
            ? adapterInfo.lifetime !== "scoped"
            : stryMutAct_9fa48("1469")
              ? false
              : stryMutAct_9fa48("1468")
                ? true
                : (stryCov_9fa48("1468", "1469", "1470"),
                  adapterInfo.lifetime ===
                    (stryMutAct_9fa48("1471") ? "" : (stryCov_9fa48("1471"), "scoped")))
        ) {
          if (stryMutAct_9fa48("1472")) {
            {
            }
          } else {
            stryCov_9fa48("1472");
            return stryMutAct_9fa48("1473") ? "" : (stryCov_9fa48("1473"), "scope-required");
          }
        }

        // Check if resolved in local singleton memo
        for (const entry of state.singletonMemo.entries) {
          if (stryMutAct_9fa48("1474")) {
            {
            }
          } else {
            stryCov_9fa48("1474");
            if (
              stryMutAct_9fa48("1477")
                ? entry.portName !== portName
                : stryMutAct_9fa48("1476")
                  ? false
                  : stryMutAct_9fa48("1475")
                    ? true
                    : (stryCov_9fa48("1475", "1476", "1477"), entry.portName === portName)
            ) {
              if (stryMutAct_9fa48("1478")) {
                {
                }
              } else {
                stryCov_9fa48("1478");
                return stryMutAct_9fa48("1479") ? false : (stryCov_9fa48("1479"), true);
              }
            }
          }
        }

        // For child containers, check parent's singleton memo for inherited resolutions
        if (
          stryMutAct_9fa48("1482")
            ? state.parentState === undefined
            : stryMutAct_9fa48("1481")
              ? false
              : stryMutAct_9fa48("1480")
                ? true
                : (stryCov_9fa48("1480", "1481", "1482"), state.parentState !== undefined)
        ) {
          if (stryMutAct_9fa48("1483")) {
            {
            }
          } else {
            stryCov_9fa48("1483");
            return isResolvedInParentChain(state.parentState, portName);
          }
        }
        return stryMutAct_9fa48("1484") ? true : (stryCov_9fa48("1484"), false);
      }
    }

    /**
     * Recursively checks parent chain for resolved singletons.
     */
    function isResolvedInParentChain(
      parentState: ContainerInternalState,
      portName: string
    ): boolean {
      if (stryMutAct_9fa48("1485")) {
        {
        }
      } else {
        stryCov_9fa48("1485");
        // Check parent's singleton memo
        for (const entry of parentState.singletonMemo.entries) {
          if (stryMutAct_9fa48("1486")) {
            {
            }
          } else {
            stryCov_9fa48("1486");
            if (
              stryMutAct_9fa48("1489")
                ? entry.portName !== portName
                : stryMutAct_9fa48("1488")
                  ? false
                  : stryMutAct_9fa48("1487")
                    ? true
                    : (stryCov_9fa48("1487", "1488", "1489"), entry.portName === portName)
            ) {
              if (stryMutAct_9fa48("1490")) {
                {
                }
              } else {
                stryCov_9fa48("1490");
                return stryMutAct_9fa48("1491") ? false : (stryCov_9fa48("1491"), true);
              }
            }
          }
        }

        // Recursively check grandparent if present
        if (
          stryMutAct_9fa48("1494")
            ? parentState.parentState === undefined
            : stryMutAct_9fa48("1493")
              ? false
              : stryMutAct_9fa48("1492")
                ? true
                : (stryCov_9fa48("1492", "1493", "1494"), parentState.parentState !== undefined)
        ) {
          if (stryMutAct_9fa48("1495")) {
            {
            }
          } else {
            stryCov_9fa48("1495");
            return isResolvedInParentChain(parentState.parentState, portName);
          }
        }
        return stryMutAct_9fa48("1496") ? true : (stryCov_9fa48("1496"), false);
      }
    }

    /**
     * Implementation of getScopeTree() method.
     *
     * Builds hierarchical tree from container and child scopes.
     */
    function getScopeTree(): ScopeTree {
      if (stryMutAct_9fa48("1497")) {
        {
        }
      } else {
        stryCov_9fa48("1497");
        const accessor = getAccessor();
        const state = accessor(); // This throws if disposed

        return buildContainerScopeTree(state);
      }
    }

    // Create and freeze the inspector object
    const inspector: ContainerInspector = stryMutAct_9fa48("1498")
      ? {}
      : (stryCov_9fa48("1498"),
        {
          snapshot,
          listPorts,
          isResolved,
          getScopeTree,
        });
    return Object.freeze(inspector);
  }
}
