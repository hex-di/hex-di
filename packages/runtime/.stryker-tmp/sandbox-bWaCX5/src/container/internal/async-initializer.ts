/**
 * AsyncInitializer - Manages async adapter initialization with topological ordering.
 *
 * Uses dependency graph analysis to automatically determine initialization order:
 * - Adapters with no async dependencies initialize first
 * - Adapters are grouped into levels based on dependency depth
 * - Each level is initialized in parallel for maximum performance
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
import type { Port } from "@hex-di/core";
import { AsyncFactoryError } from "../../errors/index.js";
import type { RuntimeAdapter } from "../internal-types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for resolving async ports during initialization.
 * @internal
 */
export type AsyncInitializationResolver = (port: Port<unknown, string>) => Promise<unknown>;

/**
 * A level of adapters that can be initialized in parallel.
 * All adapters in a level have their dependencies satisfied by previous levels.
 * @internal
 */
type InitLevel = RuntimeAdapter[];

// =============================================================================
// AsyncInitializer Class
// =============================================================================

/**
 * Manages async adapter initialization with automatic topological ordering.
 *
 * Key features:
 * - **Automatic ordering**: Uses dependency graph to compute initialization order
 * - **Parallel initialization**: Adapters at the same level initialize concurrently
 * - **Idempotent**: Multiple initialize() calls share the same promise
 * - **Error enhancement**: Adds initialization context to errors
 *
 * The initialization algorithm:
 * 1. Build adjacency list from adapter dependencies
 * 2. Compute initialization levels using Kahn's algorithm
 * 3. Initialize each level in parallel with Promise.all()
 *
 * @example
 * ```typescript
 * const initializer = new AsyncInitializer();
 *
 * // Register adapters during graph processing
 * initializer.registerAdapter(dbAdapter);
 * initializer.registerAdapter(cacheAdapter);
 *
 * // Finalize computes initialization levels
 * initializer.finalizeRegistration();
 *
 * // Initialize all async services (automatic ordering + parallel)
 * await initializer.initialize(port => container.resolveAsyncInternal(port));
 * ```
 *
 * @internal
 */
export class AsyncInitializer {
  /**
   * Set of ports that have async factories.
   */
  private readonly asyncPorts: Set<Port<unknown, string>> = new Set();

  /**
   * Registered async adapters (unordered, populated during registration).
   */
  private readonly asyncAdapters: RuntimeAdapter[] = stryMutAct_9fa48("572")
    ? ["Stryker was here"]
    : (stryCov_9fa48("572"), []);

  /**
   * Initialization levels computed by topological sort.
   * Level 0 has no async dependencies, Level 1 depends only on Level 0, etc.
   */
  private initLevels: InitLevel[] = stryMutAct_9fa48("573")
    ? ["Stryker was here"]
    : (stryCov_9fa48("573"), []);

  /**
   * Whether initialization has completed successfully.
   */
  private initialized: boolean = stryMutAct_9fa48("574") ? true : (stryCov_9fa48("574"), false);

  /**
   * Active initialization promise for deduplication.
   */
  private initializationPromise: Promise<void> | null = null;

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Whether all async adapters have been initialized.
   */
  get isInitialized(): boolean {
    if (stryMutAct_9fa48("575")) {
      {
      }
    } else {
      stryCov_9fa48("575");
      return this.initialized;
    }
  }

  /**
   * Registers an async adapter for initialization.
   *
   * @param adapter - The async adapter to register
   */
  registerAdapter(adapter: RuntimeAdapter): void {
    if (stryMutAct_9fa48("576")) {
      {
      }
    } else {
      stryCov_9fa48("576");
      this.asyncPorts.add(adapter.provides);
      this.asyncAdapters.push(adapter);
    }
  }

  /**
   * Finalizes adapter registration by computing initialization levels.
   *
   * Uses Kahn's algorithm to produce a topological ordering grouped into levels.
   * Adapters at the same level can be initialized in parallel.
   */
  finalizeRegistration(): void {
    if (stryMutAct_9fa48("577")) {
      {
      }
    } else {
      stryCov_9fa48("577");
      this.initLevels = this.computeInitLevels();
    }
  }

  /**
   * Checks if a port has an async factory requiring initialization.
   *
   * @param port - The port to check
   * @returns True if the port requires async initialization
   */
  hasAsyncPort(port: Port<unknown, string>): boolean {
    if (stryMutAct_9fa48("578")) {
      {
      }
    } else {
      stryCov_9fa48("578");
      return this.asyncPorts.has(port);
    }
  }

  /**
   * Marks the initializer as already initialized.
   *
   * Used for child containers that inherit initialization state from parent.
   */
  markInitialized(): void {
    if (stryMutAct_9fa48("579")) {
      {
      }
    } else {
      stryCov_9fa48("579");
      this.initialized = stryMutAct_9fa48("580") ? false : (stryCov_9fa48("580"), true);
    }
  }

  /**
   * Initializes all async adapters in topological order with parallel execution.
   *
   * This method is idempotent - multiple concurrent calls share the same promise.
   * Each level is initialized in parallel using Promise.all().
   *
   * @param resolveAsync - Callback to resolve each async port
   * @throws AsyncFactoryError if any adapter factory fails
   */
  async initialize(resolveAsync: AsyncInitializationResolver): Promise<void> {
    if (stryMutAct_9fa48("581")) {
      {
      }
    } else {
      stryCov_9fa48("581");
      if (
        stryMutAct_9fa48("583")
          ? false
          : stryMutAct_9fa48("582")
            ? true
            : (stryCov_9fa48("582", "583"), this.initialized)
      ) {
        if (stryMutAct_9fa48("584")) {
          {
          }
        } else {
          stryCov_9fa48("584");
          return;
        }
      }
      if (
        stryMutAct_9fa48("587")
          ? this.initializationPromise === null
          : stryMutAct_9fa48("586")
            ? false
            : stryMutAct_9fa48("585")
              ? true
              : (stryCov_9fa48("585", "586", "587"), this.initializationPromise !== null)
      ) {
        if (stryMutAct_9fa48("588")) {
          {
          }
        } else {
          stryCov_9fa48("588");
          await this.initializationPromise;
          return;
        }
      }
      this.initializationPromise = this.executeInitialization(resolveAsync);
      try {
        if (stryMutAct_9fa48("589")) {
          {
          }
        } else {
          stryCov_9fa48("589");
          await this.initializationPromise;
        }
      } finally {
        if (stryMutAct_9fa48("590")) {
          {
          }
        } else {
          stryCov_9fa48("590");
          this.initializationPromise = null;
        }
      }
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Computes initialization levels using Kahn's algorithm.
   *
   * @returns Array of levels, where each level contains adapters that can be initialized in parallel
   */
  private computeInitLevels(): InitLevel[] {
    if (stryMutAct_9fa48("591")) {
      {
      }
    } else {
      stryCov_9fa48("591");
      if (
        stryMutAct_9fa48("594")
          ? this.asyncAdapters.length !== 0
          : stryMutAct_9fa48("593")
            ? false
            : stryMutAct_9fa48("592")
              ? true
              : (stryCov_9fa48("592", "593", "594"), this.asyncAdapters.length === 0)
      ) {
        if (stryMutAct_9fa48("595")) {
          {
          }
        } else {
          stryCov_9fa48("595");
          return stryMutAct_9fa48("596") ? ["Stryker was here"] : (stryCov_9fa48("596"), []);
        }
      }

      // Map port name to adapter for quick lookup
      const adapterByPortName = new Map<string, RuntimeAdapter>();
      for (const adapter of this.asyncAdapters) {
        if (stryMutAct_9fa48("597")) {
          {
          }
        } else {
          stryCov_9fa48("597");
          adapterByPortName.set(adapter.provides.__portName, adapter);
        }
      }

      // Compute in-degree for each async adapter (count of async dependencies)
      const inDegree = new Map<string, number>();
      for (const adapter of this.asyncAdapters) {
        if (stryMutAct_9fa48("598")) {
          {
          }
        } else {
          stryCov_9fa48("598");
          const portName = adapter.provides.__portName;
          let degree = 0;
          for (const requiredPort of adapter.requires) {
            if (stryMutAct_9fa48("599")) {
              {
              }
            } else {
              stryCov_9fa48("599");
              // Only count dependencies on other async adapters
              if (
                stryMutAct_9fa48("601")
                  ? false
                  : stryMutAct_9fa48("600")
                    ? true
                    : (stryCov_9fa48("600", "601"), this.asyncPorts.has(requiredPort))
              ) {
                if (stryMutAct_9fa48("602")) {
                  {
                  }
                } else {
                  stryCov_9fa48("602");
                  stryMutAct_9fa48("603") ? degree-- : (stryCov_9fa48("603"), degree++);
                }
              }
            }
          }
          inDegree.set(portName, degree);
        }
      }

      // Kahn's algorithm: process nodes level by level
      const levels: InitLevel[] = stryMutAct_9fa48("604")
        ? ["Stryker was here"]
        : (stryCov_9fa48("604"), []);
      const processed = new Set<string>();
      while (
        stryMutAct_9fa48("607")
          ? processed.size >= this.asyncAdapters.length
          : stryMutAct_9fa48("606")
            ? processed.size <= this.asyncAdapters.length
            : stryMutAct_9fa48("605")
              ? false
              : (stryCov_9fa48("605", "606", "607"), processed.size < this.asyncAdapters.length)
      ) {
        if (stryMutAct_9fa48("608")) {
          {
          }
        } else {
          stryCov_9fa48("608");
          // Find all adapters with in-degree 0 (no unprocessed dependencies)
          const currentLevel: RuntimeAdapter[] = stryMutAct_9fa48("609")
            ? ["Stryker was here"]
            : (stryCov_9fa48("609"), []);
          for (const adapter of this.asyncAdapters) {
            if (stryMutAct_9fa48("610")) {
              {
              }
            } else {
              stryCov_9fa48("610");
              const portName = adapter.provides.__portName;
              if (
                stryMutAct_9fa48("613")
                  ? !processed.has(portName) || inDegree.get(portName) === 0
                  : stryMutAct_9fa48("612")
                    ? false
                    : stryMutAct_9fa48("611")
                      ? true
                      : (stryCov_9fa48("611", "612", "613"),
                        (stryMutAct_9fa48("614")
                          ? processed.has(portName)
                          : (stryCov_9fa48("614"), !processed.has(portName))) &&
                          (stryMutAct_9fa48("616")
                            ? inDegree.get(portName) !== 0
                            : stryMutAct_9fa48("615")
                              ? true
                              : (stryCov_9fa48("615", "616"), inDegree.get(portName) === 0)))
              ) {
                if (stryMutAct_9fa48("617")) {
                  {
                  }
                } else {
                  stryCov_9fa48("617");
                  currentLevel.push(adapter);
                }
              }
            }
          }

          // Detect circular dependency (should never happen if graph validation passed)
          if (
            stryMutAct_9fa48("620")
              ? currentLevel.length !== 0
              : stryMutAct_9fa48("619")
                ? false
                : stryMutAct_9fa48("618")
                  ? true
                  : (stryCov_9fa48("618", "619", "620"), currentLevel.length === 0)
          ) {
            if (stryMutAct_9fa48("621")) {
              {
              }
            } else {
              stryCov_9fa48("621");
              const remaining = stryMutAct_9fa48("622")
                ? this.asyncAdapters.map(a => a.provides.__portName)
                : (stryCov_9fa48("622"),
                  this.asyncAdapters
                    .filter(
                      stryMutAct_9fa48("623")
                        ? () => undefined
                        : (stryCov_9fa48("623"),
                          a =>
                            stryMutAct_9fa48("624")
                              ? processed.has(a.provides.__portName)
                              : (stryCov_9fa48("624"), !processed.has(a.provides.__portName)))
                    )
                    .map(
                      stryMutAct_9fa48("625")
                        ? () => undefined
                        : (stryCov_9fa48("625"), a => a.provides.__portName)
                    ));
              throw new Error(
                stryMutAct_9fa48("626")
                  ? ``
                  : (stryCov_9fa48("626"),
                    `Circular dependency detected among async adapters: ${remaining.join(stryMutAct_9fa48("627") ? "" : (stryCov_9fa48("627"), ", "))}`)
              );
            }
          }

          // Mark current level as processed and update in-degrees
          for (const adapter of currentLevel) {
            if (stryMutAct_9fa48("628")) {
              {
              }
            } else {
              stryCov_9fa48("628");
              const portName = adapter.provides.__portName;
              processed.add(portName);

              // Decrement in-degree for all adapters that depend on this one
              for (const otherAdapter of this.asyncAdapters) {
                if (stryMutAct_9fa48("629")) {
                  {
                  }
                } else {
                  stryCov_9fa48("629");
                  if (
                    stryMutAct_9fa48("631")
                      ? false
                      : stryMutAct_9fa48("630")
                        ? true
                        : (stryCov_9fa48("630", "631"),
                          processed.has(otherAdapter.provides.__portName))
                  ) {
                    if (stryMutAct_9fa48("632")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("632");
                      continue;
                    }
                  }
                  for (const requiredPort of otherAdapter.requires) {
                    if (stryMutAct_9fa48("633")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("633");
                      if (
                        stryMutAct_9fa48("636")
                          ? requiredPort.__portName !== portName
                          : stryMutAct_9fa48("635")
                            ? false
                            : stryMutAct_9fa48("634")
                              ? true
                              : (stryCov_9fa48("634", "635", "636"),
                                requiredPort.__portName === portName)
                      ) {
                        if (stryMutAct_9fa48("637")) {
                          {
                          }
                        } else {
                          stryCov_9fa48("637");
                          const otherPortName = otherAdapter.provides.__portName;
                          inDegree.set(
                            otherPortName,
                            stryMutAct_9fa48("638")
                              ? (inDegree.get(otherPortName) ?? 0) + 1
                              : (stryCov_9fa48("638"),
                                (stryMutAct_9fa48("639")
                                  ? inDegree.get(otherPortName) && 0
                                  : (stryCov_9fa48("639"), inDegree.get(otherPortName) ?? 0)) - 1)
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          levels.push(currentLevel);
        }
      }
      return levels;
    }
  }

  /**
   * Executes the actual initialization sequence.
   */
  private async executeInitialization(resolveAsync: AsyncInitializationResolver): Promise<void> {
    if (stryMutAct_9fa48("640")) {
      {
      }
    } else {
      stryCov_9fa48("640");
      const totalAdapters = this.asyncAdapters.length;
      let completedCount = 0;
      for (const level of this.initLevels) {
        if (stryMutAct_9fa48("641")) {
          {
          }
        } else {
          stryCov_9fa48("641");
          // Initialize all adapters in this level in parallel
          const levelPromises = level.map(async adapter => {
            if (stryMutAct_9fa48("642")) {
              {
              }
            } else {
              stryCov_9fa48("642");
              const portName = adapter.provides.__portName;
              try {
                if (stryMutAct_9fa48("643")) {
                  {
                  }
                } else {
                  stryCov_9fa48("643");
                  await resolveAsync(adapter.provides);
                }
              } catch (error) {
                if (stryMutAct_9fa48("644")) {
                  {
                  }
                } else {
                  stryCov_9fa48("644");
                  // Enhance error with initialization context if not already an AsyncFactoryError
                  if (
                    stryMutAct_9fa48("646")
                      ? false
                      : stryMutAct_9fa48("645")
                        ? true
                        : (stryCov_9fa48("645", "646"), error instanceof AsyncFactoryError)
                  ) {
                    if (stryMutAct_9fa48("647")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("647");
                      throw error;
                    }
                  }
                  const contextMessage =
                    error instanceof Error
                      ? stryMutAct_9fa48("648")
                        ? ``
                        : (stryCov_9fa48("648"),
                          `${error.message} (initialization step ${stryMutAct_9fa48("649") ? completedCount - 1 : (stryCov_9fa48("649"), completedCount + 1)}/${totalAdapters})`)
                      : String(error);
                  throw new AsyncFactoryError(portName, new Error(contextMessage));
                }
              }
            }
          });

          // Wait for entire level to complete before moving to next
          await Promise.all(levelPromises);
          stryMutAct_9fa48("650")
            ? (completedCount -= level.length)
            : (stryCov_9fa48("650"), (completedCount += level.length));
        }
      }
      this.initialized = stryMutAct_9fa48("651") ? false : (stryCov_9fa48("651"), true);
    }
  }
}
