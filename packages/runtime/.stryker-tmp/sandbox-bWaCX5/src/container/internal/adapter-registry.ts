/**
 * AdapterRegistry - Centralized adapter lookup and registration.
 *
 * Simple registry that owns adapter storage and lookup logic:
 * - Local adapters (registered directly or via overrides/extensions)
 * - Parent fallback (for child containers)
 * - Override tracking (for DevTools visualization)
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
import type { RuntimeAdapter, ParentContainerLike } from "../internal-types.js";
import { ADAPTER_ACCESS } from "../../inspection/symbols.js";

/**
 * Centralized registry for adapter lookup and registration.
 *
 * Simplifies the scattered adapter access in ContainerImpl by providing:
 * - **register**: Add an adapter for a port
 * - **get**: Get adapter, checking local first then parent
 * - **isLocal**: Check if port was registered locally (not inherited)
 * - **entries**: Iterate over local adapters
 * - **markOverride**: Mark a port as overriding a parent adapter
 * - **isOverride**: Check if port overrides a parent adapter
 *
 * @example
 * ```typescript
 * const registry = new AdapterRegistry(parentContainer);
 *
 * // Register local adapters
 * registry.register(port, adapter);
 *
 * // Get adapter (checks local, then parent)
 * const adapter = registry.get(port);
 *
 * // Check if locally registered
 * if (registry.isLocal(port)) {
 *   // Handle local resolution
 * }
 *
 * // Check if an override
 * if (registry.isOverride("Logger")) {
 *   // Handle override styling in DevTools
 * }
 * ```
 *
 * @internal
 */
export class AdapterRegistry<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> {
  /**
   * Local adapter map (overrides, extensions, or root adapters).
   */
  private readonly adapters: Map<Port<unknown, string>, RuntimeAdapter> = new Map();

  /**
   * Set of ports registered locally (not inherited from parent).
   */
  private readonly localPorts: Set<Port<unknown, string>> = new Set();

  /**
   * Set of port names that override parent adapters.
   *
   * Enables DevTools to distinguish between:
   * - own: New adapter (not in parent)
   * - inherited: Adapter from parent (not overridden)
   * - overridden: Adapter that replaces parent's adapter
   */
  private readonly _overridePorts: Set<string> = new Set();

  /**
   * Creates a new AdapterRegistry.
   *
   * @param parent - Optional parent container for fallback lookup
   */
  constructor(
    private readonly parent: ParentContainerLike<TParentProvides, TAsyncPorts> | null = null
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Registers an adapter for a port.
   *
   * @param port - The port to register
   * @param adapter - The adapter providing the service
   * @param markLocal - Whether to mark this as a local registration (default: true)
   */
  register(
    port: Port<unknown, string>,
    adapter: RuntimeAdapter,
    markLocal: boolean = stryMutAct_9fa48("543") ? false : (stryCov_9fa48("543"), true)
  ): void {
    if (stryMutAct_9fa48("544")) {
      {
      }
    } else {
      stryCov_9fa48("544");
      this.adapters.set(port, adapter);
      if (
        stryMutAct_9fa48("546")
          ? false
          : stryMutAct_9fa48("545")
            ? true
            : (stryCov_9fa48("545", "546"), markLocal)
      ) {
        if (stryMutAct_9fa48("547")) {
          {
          }
        } else {
          stryCov_9fa48("547");
          this.localPorts.add(port);
        }
      }
    }
  }

  /**
   * Marks a port name as an override of a parent adapter.
   *
   * Should be called during child container creation when processing
   * the overrides map (adapters that replace parent adapters).
   *
   * @param portName - The port name to mark as override
   */
  markOverride(portName: string): void {
    if (stryMutAct_9fa48("548")) {
      {
      }
    } else {
      stryCov_9fa48("548");
      this._overridePorts.add(portName);
    }
  }

  /**
   * Gets an adapter for a port, checking local first then parent.
   *
   * @param port - The port to look up
   * @returns The adapter or undefined if not found
   */
  get(port: Port<unknown, string>): RuntimeAdapter | undefined {
    if (stryMutAct_9fa48("549")) {
      {
      }
    } else {
      stryCov_9fa48("549");
      const local = this.adapters.get(port);
      if (
        stryMutAct_9fa48("552")
          ? local === undefined
          : stryMutAct_9fa48("551")
            ? false
            : stryMutAct_9fa48("550")
              ? true
              : (stryCov_9fa48("550", "551", "552"), local !== undefined)
      ) {
        if (stryMutAct_9fa48("553")) {
          {
          }
        } else {
          stryCov_9fa48("553");
          return local;
        }
      }
      if (
        stryMutAct_9fa48("556")
          ? this.parent === null
          : stryMutAct_9fa48("555")
            ? false
            : stryMutAct_9fa48("554")
              ? true
              : (stryCov_9fa48("554", "555", "556"), this.parent !== null)
      ) {
        if (stryMutAct_9fa48("557")) {
          {
          }
        } else {
          stryCov_9fa48("557");
          return this.parent[ADAPTER_ACCESS](port);
        }
      }
      return undefined;
    }
  }

  /**
   * Checks if a port has an adapter registered (locally or in parent).
   *
   * @param port - The port to check
   * @returns True if an adapter exists
   */
  has(port: Port<unknown, string>): boolean {
    if (stryMutAct_9fa48("558")) {
      {
      }
    } else {
      stryCov_9fa48("558");
      return stryMutAct_9fa48("561")
        ? this.get(port) === undefined
        : stryMutAct_9fa48("560")
          ? false
          : stryMutAct_9fa48("559")
            ? true
            : (stryCov_9fa48("559", "560", "561"), this.get(port) !== undefined);
    }
  }

  /**
   * Checks if a port was registered locally (not inherited from parent).
   *
   * @param port - The port to check
   * @returns True if registered locally
   */
  isLocal(port: Port<unknown, string>): boolean {
    if (stryMutAct_9fa48("562")) {
      {
      }
    } else {
      stryCov_9fa48("562");
      return this.localPorts.has(port);
    }
  }

  /**
   * Checks if a port name is an override of a parent adapter.
   *
   * @param portName - The port name to check
   * @returns True if the port overrides a parent adapter
   */
  isOverride(portName: string): boolean {
    if (stryMutAct_9fa48("563")) {
      {
      }
    } else {
      stryCov_9fa48("563");
      return this._overridePorts.has(portName);
    }
  }

  /**
   * Gets the set of port names that are overrides.
   *
   * @returns A readonly set of overridden port names
   */
  get overridePorts(): ReadonlySet<string> {
    if (stryMutAct_9fa48("564")) {
      {
      }
    } else {
      stryCov_9fa48("564");
      return this._overridePorts;
    }
  }

  /**
   * Checks if a port should be resolved locally.
   *
   * For root containers: all adapters are local.
   * For child containers: only overrides and extensions are local.
   *
   * @param port - The port to check
   * @param isRoot - Whether this is a root container
   * @returns True if should resolve locally
   */
  shouldResolveLocally(port: Port<unknown, string>, isRoot: boolean): boolean {
    if (stryMutAct_9fa48("565")) {
      {
      }
    } else {
      stryCov_9fa48("565");
      if (
        stryMutAct_9fa48("567")
          ? false
          : stryMutAct_9fa48("566")
            ? true
            : (stryCov_9fa48("566", "567"), isRoot)
      ) {
        if (stryMutAct_9fa48("568")) {
          {
          }
        } else {
          stryCov_9fa48("568");
          return this.adapters.has(port);
        }
      }
      return this.localPorts.has(port);
    }
  }

  /**
   * Gets the local adapter for a port (ignores parent).
   *
   * @param port - The port to look up
   * @returns The local adapter or undefined
   */
  getLocal(port: Port<unknown, string>): RuntimeAdapter | undefined {
    if (stryMutAct_9fa48("569")) {
      {
      }
    } else {
      stryCov_9fa48("569");
      return this.adapters.get(port);
    }
  }

  /**
   * Iterates over local adapters.
   */
  entries(): IterableIterator<[Port<unknown, string>, RuntimeAdapter]> {
    if (stryMutAct_9fa48("570")) {
      {
      }
    } else {
      stryCov_9fa48("570");
      return this.adapters.entries();
    }
  }

  /**
   * Gets the number of locally registered adapters.
   */
  get size(): number {
    if (stryMutAct_9fa48("571")) {
      {
      }
    } else {
      stryCov_9fa48("571");
      return this.adapters.size;
    }
  }
}
