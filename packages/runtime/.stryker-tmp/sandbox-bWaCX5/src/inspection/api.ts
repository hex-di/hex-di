/**
 * Inspector factory with WeakMap caching.
 *
 * Creates InspectorAPI instances from containers with automatic caching
 * for performance. Uses InternalAccessible interface for type-safe access.
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
import { createBuiltinInspectorAPI } from "./builtin-api.js";
import type { InternalAccessible } from "./creation.js";
import type { InspectorAPI } from "./types.js";

// =============================================================================
// Inspector Cache
// =============================================================================

/**
 * WeakMap cache for inspector instances.
 * Enables automatic cleanup when container is garbage collected.
 * @internal
 */
const inspectorCache = new WeakMap<InternalAccessible, InspectorAPI>();

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates an InspectorAPI from a container.
 *
 * Uses WeakMap caching for performance - calling multiple times with the
 * same container returns the same inspector instance.
 *
 * @param container - Any object satisfying InternalAccessible (Container or wrapper)
 * @returns An InspectorAPI for inspecting container state
 *
 * @example
 * ```typescript
 * import { createInspector } from '@hex-di/runtime';
 *
 * // Create inspector from container
 * const inspector = createInspector(container);
 *
 * // Get snapshot
 * const snapshot = inspector.getSnapshot();
 * console.log(`Kind: ${snapshot.kind}, Phase: ${snapshot.phase}`);
 *
 * // List ports
 * const ports = inspector.listPorts();
 * console.log(`Ports: ${ports.join(', ')}`);
 *
 * // Subscribe to events
 * const unsubscribe = inspector.subscribe(event => {
 *   console.log('Event:', event.type);
 * });
 * ```
 */
export function createInspector(container: InternalAccessible): InspectorAPI {
  if (stryMutAct_9fa48("1195")) {
    {
    }
  } else {
    stryCov_9fa48("1195");
    // Check cache first
    const cached = inspectorCache.get(container);
    if (
      stryMutAct_9fa48("1198")
        ? cached === undefined
        : stryMutAct_9fa48("1197")
          ? false
          : stryMutAct_9fa48("1196")
            ? true
            : (stryCov_9fa48("1196", "1197", "1198"), cached !== undefined)
    ) {
      if (stryMutAct_9fa48("1199")) {
        {
        }
      } else {
        stryCov_9fa48("1199");
        return cached;
      }
    }

    // Create full inspector with all methods
    const inspector = createBuiltinInspectorAPI(container);

    // Cache and return
    inspectorCache.set(container, inspector);
    return inspector;
  }
}
