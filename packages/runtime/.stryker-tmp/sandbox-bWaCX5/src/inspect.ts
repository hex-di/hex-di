/**
 * Standalone container inspection function.
 *
 * Provides a simple API for inspecting container state without
 * needing to access the container.inspector property.
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
import type { Port, ContainerSnapshot } from "@hex-di/core";
import type { Container, ContainerPhase } from "./types/index.js";
import { INTERNAL_ACCESS } from "./inspection/symbols.js";
import {
  detectContainerKindFromInternal,
  buildTypedSnapshotFromInternal,
} from "./inspection/internal-helpers.js";
import { createInspector } from "./inspection/creation.js";
import type { ContainerInternalState } from "./inspection/internal-state-types.js";

/**
 * Type for objects that have INTERNAL_ACCESS symbol.
 * @internal
 */
interface HasInternalAccess {
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
}

/**
 * Inspects a container and returns a full snapshot of its state.
 *
 * Returns a frozen snapshot including:
 * - All adapters registered in the container
 * - All cached singleton instances
 * - Scope tree structure
 * - Lifetime information for each adapter
 * - Container metadata (name, kind, phase)
 *
 * @param container - The container to inspect
 * @returns A frozen ContainerSnapshot with full state information
 *
 * @example
 * ```typescript
 * import { createContainer, inspect } from '@hex-di/runtime';
 *
 * const container = createContainer({ graph: graph, name: 'App'  });
 * container.resolve(LoggerPort);
 *
 * const snapshot = inspect(container);
 * console.log('Singletons:', snapshot.singletons.length);
 * console.log('Phase:', snapshot.phase);
 * console.log('Kind:', snapshot.kind);
 * ```
 */
export function inspect<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): ContainerSnapshot {
  if (stryMutAct_9fa48("1194")) {
    {
    }
  } else {
    stryCov_9fa48("1194");
    // Access internal state via symbol
    const internalState = (container as HasInternalAccess)[INTERNAL_ACCESS]();

    // Create runtime inspector for snapshot
    const runtimeInspector = createInspector(container);
    const runtimeSnapshot = runtimeInspector.snapshot();

    // Detect container kind and build typed snapshot
    const containerKind = detectContainerKindFromInternal(internalState);
    return buildTypedSnapshotFromInternal(runtimeSnapshot, containerKind, internalState);
  }
}
