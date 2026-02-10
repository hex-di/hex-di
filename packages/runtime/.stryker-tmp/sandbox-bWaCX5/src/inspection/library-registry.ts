/**
 * Library Inspector Registry
 *
 * Internal component of InspectorAPI that manages library inspector
 * registration, event forwarding, snapshot aggregation, and disposal.
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
import type { LibraryInspector, InspectorEvent } from "@hex-di/core";
import { isLibraryInspector } from "@hex-di/core";

// =============================================================================
// Library Registry Factory
// =============================================================================

/**
 * Callback type for emitting container-level events.
 * @internal
 */
type EmitContainerEvent = (event: InspectorEvent) => void;

/**
 * Library registry interface.
 * @internal
 */
export interface LibraryRegistry {
  registerLibrary(inspector: LibraryInspector, emitContainerEvent: EmitContainerEvent): () => void;
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector>;
  getLibraryInspector(name: string): LibraryInspector | undefined;
  getLibrarySnapshots(): Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  dispose(): void;
}

/**
 * Creates a library registry that manages library inspector registration,
 * event forwarding, snapshot aggregation, and disposal.
 *
 * Follows the same factory pattern as createResultTracker in builtin-api.ts.
 *
 * @internal
 */
export function createLibraryRegistry(): LibraryRegistry {
  if (stryMutAct_9fa48("1743")) {
    {
    }
  } else {
    stryCov_9fa48("1743");
    const inspectors = new Map<string, LibraryInspector>();
    const subscriptions = new Map<string, () => void>();
    function unregisterByName(name: string, emitContainerEvent: EmitContainerEvent): void {
      if (stryMutAct_9fa48("1744")) {
        {
        }
      } else {
        stryCov_9fa48("1744");
        const existingUnsub = subscriptions.get(name);
        if (
          stryMutAct_9fa48("1747")
            ? existingUnsub === undefined
            : stryMutAct_9fa48("1746")
              ? false
              : stryMutAct_9fa48("1745")
                ? true
                : (stryCov_9fa48("1745", "1746", "1747"), existingUnsub !== undefined)
        ) {
          if (stryMutAct_9fa48("1748")) {
            {
            }
          } else {
            stryCov_9fa48("1748");
            try {
              if (stryMutAct_9fa48("1749")) {
                {
                }
              } else {
                stryCov_9fa48("1749");
                existingUnsub();
              }
            } catch {
              // Tolerate unsubscribe failures
            }
            subscriptions.delete(name);
          }
        }
        const existingInspector = inspectors.get(name);
        if (
          stryMutAct_9fa48("1752")
            ? existingInspector === undefined
            : stryMutAct_9fa48("1751")
              ? false
              : stryMutAct_9fa48("1750")
                ? true
                : (stryCov_9fa48("1750", "1751", "1752"), existingInspector !== undefined)
        ) {
          if (stryMutAct_9fa48("1753")) {
            {
            }
          } else {
            stryCov_9fa48("1753");
            try {
              if (stryMutAct_9fa48("1754")) {
                {
                }
              } else {
                stryCov_9fa48("1754");
                stryMutAct_9fa48("1755")
                  ? existingInspector.dispose()
                  : (stryCov_9fa48("1755"), existingInspector.dispose?.());
              }
            } catch {
              // Tolerate dispose failures
            }
            inspectors.delete(name);
          }
        }
        emitContainerEvent(
          stryMutAct_9fa48("1756")
            ? {}
            : (stryCov_9fa48("1756"),
              {
                type: stryMutAct_9fa48("1757")
                  ? ""
                  : (stryCov_9fa48("1757"), "library-unregistered"),
                name,
              })
        );
      }
    }
    return stryMutAct_9fa48("1758")
      ? {}
      : (stryCov_9fa48("1758"),
        {
          registerLibrary(
            inspector: LibraryInspector,
            emitContainerEvent: EmitContainerEvent
          ): () => void {
            if (stryMutAct_9fa48("1759")) {
              {
              }
            } else {
              stryCov_9fa48("1759");
              if (
                stryMutAct_9fa48("1762")
                  ? false
                  : stryMutAct_9fa48("1761")
                    ? true
                    : stryMutAct_9fa48("1760")
                      ? isLibraryInspector(inspector)
                      : (stryCov_9fa48("1760", "1761", "1762"), !isLibraryInspector(inspector))
              ) {
                if (stryMutAct_9fa48("1763")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1763");
                  throw new TypeError(
                    stryMutAct_9fa48("1764")
                      ? ""
                      : (stryCov_9fa48("1764"),
                        "Invalid LibraryInspector: value does not satisfy the protocol")
                  );
                }
              }

              // Last-write-wins: if name exists, unregister old first
              if (
                stryMutAct_9fa48("1766")
                  ? false
                  : stryMutAct_9fa48("1765")
                    ? true
                    : (stryCov_9fa48("1765", "1766"), inspectors.has(inspector.name))
              ) {
                if (stryMutAct_9fa48("1767")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1767");
                  unregisterByName(inspector.name, emitContainerEvent);
                }
              }
              inspectors.set(inspector.name, inspector);

              // Subscribe to library events if subscribe is provided
              if (
                stryMutAct_9fa48("1770")
                  ? inspector.subscribe === undefined
                  : stryMutAct_9fa48("1769")
                    ? false
                    : stryMutAct_9fa48("1768")
                      ? true
                      : (stryCov_9fa48("1768", "1769", "1770"), inspector.subscribe !== undefined)
              ) {
                if (stryMutAct_9fa48("1771")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1771");
                  const unsub = inspector.subscribe(event => {
                    if (stryMutAct_9fa48("1772")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1772");
                      emitContainerEvent(
                        stryMutAct_9fa48("1773")
                          ? {}
                          : (stryCov_9fa48("1773"),
                            {
                              type: stryMutAct_9fa48("1774")
                                ? ""
                                : (stryCov_9fa48("1774"), "library"),
                              event,
                            })
                      );
                    }
                  });
                  subscriptions.set(inspector.name, unsub);
                }
              }
              emitContainerEvent(
                stryMutAct_9fa48("1775")
                  ? {}
                  : (stryCov_9fa48("1775"),
                    {
                      type: stryMutAct_9fa48("1776")
                        ? ""
                        : (stryCov_9fa48("1776"), "library-registered"),
                      name: inspector.name,
                    })
              );
              let unregistered = stryMutAct_9fa48("1777") ? true : (stryCov_9fa48("1777"), false);
              return () => {
                if (stryMutAct_9fa48("1778")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1778");
                  if (
                    stryMutAct_9fa48("1780")
                      ? false
                      : stryMutAct_9fa48("1779")
                        ? true
                        : (stryCov_9fa48("1779", "1780"), unregistered)
                  )
                    return;
                  unregistered = stryMutAct_9fa48("1781") ? false : (stryCov_9fa48("1781"), true);
                  // Only unregister if this inspector is still the one registered under that name
                  // (a replacement may have already unregistered it)
                  if (
                    stryMutAct_9fa48("1784")
                      ? inspectors.get(inspector.name) !== inspector
                      : stryMutAct_9fa48("1783")
                        ? false
                        : stryMutAct_9fa48("1782")
                          ? true
                          : (stryCov_9fa48("1782", "1783", "1784"),
                            inspectors.get(inspector.name) === inspector)
                  ) {
                    if (stryMutAct_9fa48("1785")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1785");
                      unregisterByName(inspector.name, emitContainerEvent);
                    }
                  }
                }
              };
            }
          },
          getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> {
            if (stryMutAct_9fa48("1786")) {
              {
              }
            } else {
              stryCov_9fa48("1786");
              return new Map(inspectors);
            }
          },
          getLibraryInspector(name: string): LibraryInspector | undefined {
            if (stryMutAct_9fa48("1787")) {
              {
              }
            } else {
              stryCov_9fa48("1787");
              return inspectors.get(name);
            }
          },
          getLibrarySnapshots(): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
            if (stryMutAct_9fa48("1788")) {
              {
              }
            } else {
              stryCov_9fa48("1788");
              const result: Record<string, Readonly<Record<string, unknown>>> = {};
              for (const [name, inspector] of inspectors) {
                if (stryMutAct_9fa48("1789")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1789");
                  try {
                    if (stryMutAct_9fa48("1790")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1790");
                      result[name] = inspector.getSnapshot();
                    }
                  } catch {
                    if (stryMutAct_9fa48("1791")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1791");
                      result[name] = Object.freeze(
                        stryMutAct_9fa48("1792")
                          ? {}
                          : (stryCov_9fa48("1792"),
                            {
                              error: stryMutAct_9fa48("1793")
                                ? ""
                                : (stryCov_9fa48("1793"), "snapshot-failed"),
                            })
                      );
                    }
                  }
                }
              }
              return Object.freeze(result);
            }
          },
          dispose(): void {
            if (stryMutAct_9fa48("1794")) {
              {
              }
            } else {
              stryCov_9fa48("1794");
              for (const [, unsub] of subscriptions) {
                if (stryMutAct_9fa48("1795")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1795");
                  try {
                    if (stryMutAct_9fa48("1796")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1796");
                      unsub();
                    }
                  } catch {
                    // Tolerate individual unsubscribe failures
                  }
                }
              }
              for (const [, inspector] of inspectors) {
                if (stryMutAct_9fa48("1797")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1797");
                  try {
                    if (stryMutAct_9fa48("1798")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1798");
                      stryMutAct_9fa48("1799")
                        ? inspector.dispose()
                        : (stryCov_9fa48("1799"), inspector.dispose?.());
                    }
                  } catch {
                    // Tolerate individual dispose failures
                  }
                }
              }
              inspectors.clear();
              subscriptions.clear();
            }
          },
        });
  }
}
