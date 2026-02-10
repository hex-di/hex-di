/**
 * InheritanceResolver - Handles child container inheritance modes.
 *
 * Encapsulates the resolution logic for child containers that inherit
 * from a parent container with different inheritance modes:
 * - shared: Use parent's instance directly
 * - forked: Shallow clone of parent's instance (cached per port)
 * - isolated: Delegated back to container (requires full type context)
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
import type { Port, InferService } from "@hex-di/core";
import type { InheritanceMode } from "../../types.js";
import type { ForkedEntry, ParentContainerLike, RuntimeAdapterFor } from "../internal-types.js";
import { isForkedEntryForPort, isAdapterForPort } from "../internal-types.js";
import { shallowClone } from "../helpers.js";
import { ADAPTER_ACCESS } from "../../inspection/symbols.js";
import { NonClonableForkedError } from "../../errors/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for creating isolated instances when an adapter is available.
 *
 * Called by InheritanceResolver when:
 * - Port is in isolated mode
 * - Parent has an adapter for the port
 *
 * The callback is responsible for:
 * - Resolving dependencies using the child container's resolution
 * - Creating the instance with the adapter's factory
 * - Memoization (typically in singleton memo)
 *
 * @internal
 */
export type IsolatedInstanceCreator<TProvides extends Port<unknown, string>> = <
  P extends TProvides,
>(
  port: P,
  adapter: RuntimeAdapterFor<P>
) => InferService<P>;

// =============================================================================
// InheritanceResolver Class
// =============================================================================

/**
 * Manages child container inheritance mode resolution.
 *
 * This class handles all three inheritance modes:
 * - **shared**: Returns parent's singleton instance directly
 * - **forked**: Creates and caches a shallow clone of parent's instance
 * - **isolated**: Creates new instance via callback with child's dependency resolution
 *
 * @example
 * ```typescript
 * const resolver = new InheritanceResolver(parentContainer, inheritanceModes);
 *
 * const service = resolver.resolveWithCallback(port, (p, adapter) => {
 *   // Create isolated instance with adapter
 *   return createInstanceWithDeps(p, adapter);
 * });
 * ```
 *
 * @internal
 */
export class InheritanceResolver<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> {
  /**
   * Cache for forked instances (shallow clones of parent instances).
   */
  private readonly forkedInstances: Map<string, ForkedEntry<Port<unknown, string>>> = new Map();

  /**
   * Creates a new InheritanceResolver.
   *
   * @param parentContainer - The parent container to inherit from
   * @param inheritanceModes - Map of port names to their inheritance modes
   */
  constructor(
    private readonly parentContainer: ParentContainerLike<TProvides, TAsyncPorts>,
    private readonly inheritanceModes: ReadonlyMap<string, InheritanceMode>
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Gets the inheritance mode for a port.
   *
   * @param portName - The port name to check
   * @returns The inheritance mode, defaulting to 'shared'
   */
  getMode(portName: string): InheritanceMode {
    if (stryMutAct_9fa48("652")) {
      {
      }
    } else {
      stryCov_9fa48("652");
      return stryMutAct_9fa48("653")
        ? this.inheritanceModes.get(portName) && "shared"
        : (stryCov_9fa48("653"),
          this.inheritanceModes.get(portName) ??
            (stryMutAct_9fa48("654") ? "" : (stryCov_9fa48("654"), "shared")));
    }
  }

  /**
   * Resolves a port using the appropriate inheritance mode with callback for isolated mode.
   *
   * This method encapsulates all inheritance resolution:
   * - **shared**: Returns parent's singleton instance directly
   * - **forked**: Returns cached shallow clone of parent's instance
   * - **isolated**: Creates new instance using callback (or clones parent as fallback)
   *
   * @example
   * ```typescript
   * const service = resolver.resolveWithCallback(port, (p, adapter) => {
   *   // Create isolated instance with adapter
   *   return createInstanceWithDeps(p, adapter);
   * });
   * ```
   *
   * @param port - The port to resolve
   * @param createIsolated - Callback to create instance when adapter is available
   * @returns The resolved service instance with full type inference
   */
  resolveWithCallback<P extends TProvides>(
    port: P,
    createIsolated: IsolatedInstanceCreator<TProvides>
  ): InferService<P> {
    if (stryMutAct_9fa48("655")) {
      {
      }
    } else {
      stryCov_9fa48("655");
      const portName = port.__portName;
      const mode = this.getMode(portName);
      switch (mode) {
        case stryMutAct_9fa48("657") ? "" : (stryCov_9fa48("657"), "shared"):
          if (stryMutAct_9fa48("656")) {
          } else {
            stryCov_9fa48("656");
            return this.resolveShared(port);
          }
        case stryMutAct_9fa48("659") ? "" : (stryCov_9fa48("659"), "forked"):
          if (stryMutAct_9fa48("658")) {
          } else {
            stryCov_9fa48("658");
            return this.resolveForked(port, portName);
          }
        case stryMutAct_9fa48("661") ? "" : (stryCov_9fa48("661"), "isolated"):
          if (stryMutAct_9fa48("660")) {
          } else {
            stryCov_9fa48("660");
            return this.resolveIsolated(port, createIsolated);
          }
        default:
          if (stryMutAct_9fa48("662")) {
          } else {
            stryCov_9fa48("662");
            throw new Error(
              stryMutAct_9fa48("663")
                ? ``
                : (stryCov_9fa48("663"), `Unknown inheritance mode: ${mode}`)
            );
          }
      }
    }
  }

  /**
   * Resolves using shared mode for resolveInternal calls.
   * Used when a scope calls resolveInternal on the container.
   *
   * @param port - The port to resolve
   * @returns The resolved service from parent
   */
  resolveSharedInternal<P extends TProvides>(port: P): InferService<P> {
    if (stryMutAct_9fa48("664")) {
      {
      }
    } else {
      stryCov_9fa48("664");
      // SAFETY: Parent container is guaranteed to provide this port (checked by adapter registry).
      // Cast needed because resolveInternal returns more general type than InferService<P>.
      return this.parentContainer.resolveInternal(port) as InferService<P>;
    }
  }

  // ===========================================================================
  // Private Resolution Methods
  // ===========================================================================

  /**
   * Resolves using shared mode - delegates directly to parent.
   */
  private resolveShared<P extends TProvides>(port: P): InferService<P> {
    if (stryMutAct_9fa48("665")) {
      {
      }
    } else {
      stryCov_9fa48("665");
      // SAFETY: Parent container is guaranteed to provide this port (validated by mode check).
      // Cast needed because resolveInternal returns more general type than InferService<P>.
      return this.parentContainer.resolveInternal(port) as InferService<P>;
    }
  }

  /**
   * Resolves using forked mode - shallow clone of parent instance.
   *
   * @throws {NonClonableForkedError} If the adapter is not marked as clonable
   */
  private resolveForked<P extends TProvides>(port: P, portName: string): InferService<P> {
    if (stryMutAct_9fa48("666")) {
      {
      }
    } else {
      stryCov_9fa48("666");
      const cached = this.forkedInstances.get(portName);
      if (
        stryMutAct_9fa48("669")
          ? cached !== undefined || isForkedEntryForPort(cached, port)
          : stryMutAct_9fa48("668")
            ? false
            : stryMutAct_9fa48("667")
              ? true
              : (stryCov_9fa48("667", "668", "669"),
                (stryMutAct_9fa48("671")
                  ? cached === undefined
                  : stryMutAct_9fa48("670")
                    ? true
                    : (stryCov_9fa48("670", "671"), cached !== undefined)) &&
                  isForkedEntryForPort(cached, port))
      ) {
        if (stryMutAct_9fa48("672")) {
          {
          }
        } else {
          stryCov_9fa48("672");
          return cached.instance;
        }
      }

      // Check if adapter is clonable before cloning
      const adapter = this.parentContainer[ADAPTER_ACCESS](port);
      if (
        stryMutAct_9fa48("675")
          ? adapter === undefined && !adapter.clonable
          : stryMutAct_9fa48("674")
            ? false
            : stryMutAct_9fa48("673")
              ? true
              : (stryCov_9fa48("673", "674", "675"),
                (stryMutAct_9fa48("677")
                  ? adapter !== undefined
                  : stryMutAct_9fa48("676")
                    ? false
                    : (stryCov_9fa48("676", "677"), adapter === undefined)) ||
                  (stryMutAct_9fa48("678")
                    ? adapter.clonable
                    : (stryCov_9fa48("678"), !adapter.clonable)))
      ) {
        if (stryMutAct_9fa48("679")) {
          {
          }
        } else {
          stryCov_9fa48("679");
          throw new NonClonableForkedError(portName);
        }
      }
      const parentInstance = this.parentContainer.resolveInternal(port);
      // SAFETY: shallowClone preserves the structure of parentInstance which is InferService<P>.
      // Cast needed because shallowClone returns unknown (generic utility function).
      const forkedInstance = shallowClone(parentInstance) as InferService<P>;
      const entry: ForkedEntry<P> = stryMutAct_9fa48("680")
        ? {}
        : (stryCov_9fa48("680"),
          {
            port,
            instance: forkedInstance,
          });
      // SAFETY: Widening ForkedEntry<P> to ForkedEntry<Port<unknown, string>> for storage in Map.
      // Sound because the Map is keyed by portName and we validate port identity on retrieval.
      this.forkedInstances.set(portName, entry as ForkedEntry<Port<unknown, string>>);
      return forkedInstance;
    }
  }

  /**
   * Resolves using isolated mode - new instance with child's dependency resolution.
   *
   * If parent has an adapter for the port, uses the callback to create the instance.
   * Otherwise, falls back to shallow cloning the parent's instance.
   */
  private resolveIsolated<P extends TProvides>(
    port: P,
    createIsolated: IsolatedInstanceCreator<TProvides>
  ): InferService<P> {
    if (stryMutAct_9fa48("681")) {
      {
      }
    } else {
      stryCov_9fa48("681");
      const adapter = this.parentContainer[ADAPTER_ACCESS](port);
      if (
        stryMutAct_9fa48("684")
          ? adapter !== undefined
          : stryMutAct_9fa48("683")
            ? false
            : stryMutAct_9fa48("682")
              ? true
              : (stryCov_9fa48("682", "683", "684"), adapter === undefined)
      ) {
        if (stryMutAct_9fa48("685")) {
          {
          }
        } else {
          stryCov_9fa48("685");
          // Fallback: clone parent instance when no adapter is available
          const parentInstance = this.parentContainer.resolveInternal(port);
          // SAFETY: shallowClone preserves the structure of parentInstance which is InferService<P>.
          // Cast needed because shallowClone returns unknown (generic utility function).
          return shallowClone(parentInstance) as InferService<P>;
        }
      }
      if (
        stryMutAct_9fa48("688")
          ? false
          : stryMutAct_9fa48("687")
            ? true
            : stryMutAct_9fa48("686")
              ? isAdapterForPort(adapter, port)
              : (stryCov_9fa48("686", "687", "688"), !isAdapterForPort(adapter, port))
      ) {
        if (stryMutAct_9fa48("689")) {
          {
          }
        } else {
          stryCov_9fa48("689");
          throw new Error(
            stryMutAct_9fa48("690")
              ? ``
              : (stryCov_9fa48("690"), `Adapter mismatch for port ${port.__portName}.`)
          );
        }
      }
      return createIsolated(port, adapter);
    }
  }
}
