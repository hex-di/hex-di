/**
 * Type guards and helper functions for type-safe container access.
 *
 * These utilities allow accessing InspectorAPI from containers without unsafe casts.
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
import type { Port } from "@hex-di/core";
import type { InspectorAPI } from "./types.js";
import { INSPECTOR } from "./symbols.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Container type with InspectorPlugin registered.
 *
 * Use this type when you need to explicitly type a container that is known
 * to have InspectorPlugin at compile time.
 *
 * @example
 * ```typescript
 * function processSnapshot(container: ContainerWithInspector) {
 *   // container[INSPECTOR] is fully typed as InspectorAPI
 *   const snapshot = container[INSPECTOR].getSnapshot();
 * }
 * ```
 */
export type ContainerWithInspector<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
> = Container<TProvides, TExtends, TAsyncPorts, TPhase> & {
  readonly [INSPECTOR]: InspectorAPI;
};

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard that narrows a container to one with InspectorAPI.
 *
 * Use this to get type-safe access to container[INSPECTOR] without unsafe casts.
 * After the check, TypeScript knows the container has the INSPECTOR symbol.
 *
 * @param container - Any container (with or without InspectorPlugin)
 * @returns True if the container has InspectorPlugin registered
 *
 * @example
 * ```typescript
 * function useInspector(container: Container<...>) {
 *   if (hasInspector(container)) {
 *     // container[INSPECTOR] is now InspectorAPI (fully typed)
 *     const snapshot = container[INSPECTOR].getSnapshot();
 *     const phase = container[INSPECTOR].getPhase();
 *   }
 * }
 * ```
 */
export function hasInspector<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): container is ContainerWithInspector<TProvides, TExtends, TAsyncPorts, TPhase> {
  if (stryMutAct_9fa48("1805")) {
    {
    }
  } else {
    stryCov_9fa48("1805");
    return INSPECTOR in container;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely extract InspectorAPI from a container if InspectorPlugin is registered.
 *
 * This function provides type-safe access to the inspector API without requiring
 * the caller to know the container's plugin configuration at compile time.
 *
 * @param container - Any container (with or without InspectorPlugin)
 * @returns InspectorAPI if InspectorPlugin is registered, undefined otherwise
 *
 * @example
 * ```typescript
 * const inspectorAPI = getInspectorAPI(container);
 * if (inspectorAPI) {
 *   const snapshot = inspectorAPI.getSnapshot();
 *   const phase = inspectorAPI.getPhase();
 * }
 * ```
 *
 * @example Using with optional chaining
 * ```typescript
 * const snapshot = getInspectorAPI(container)?.getSnapshot();
 * ```
 */
export function getInspectorAPI<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): InspectorAPI | undefined {
  if (stryMutAct_9fa48("1806")) {
    {
    }
  } else {
    stryCov_9fa48("1806");
    if (
      stryMutAct_9fa48("1808")
        ? false
        : stryMutAct_9fa48("1807")
          ? true
          : (stryCov_9fa48("1807", "1808"), hasInspector(container))
    ) {
      if (stryMutAct_9fa48("1809")) {
        {
        }
      } else {
        stryCov_9fa48("1809");
        return container[INSPECTOR];
      }
    }
    return undefined;
  }
}
