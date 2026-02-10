/**
 * Shared wrapper utilities for container creation.
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
import type { Graph } from "@hex-di/graph";
import type { InspectorAPI } from "../inspection/types.js";
import { createBuiltinInspectorAPI } from "../inspection/builtin-api.js";
import type { InternalAccessible } from "../inspection/creation.js";
import type {
  InheritanceModeConfig,
  InheritanceMode,
  RuntimePerformanceOptions,
} from "../types.js";
import type { RuntimeAdapter, ParentContainerLike, ChildContainerConfig } from "./impl.js";
import { generateChildContainerId } from "./id-generator.js";
import { isInheritanceMode } from "./helpers.js";

// =============================================================================
// Builtin API Attachment Helper
// =============================================================================

/**
 * Type for container objects that support INTERNAL_ACCESS and can have
 * inspector attached.
 *
 * @internal
 */
export interface AttachableContainer extends InternalAccessible {
  inspector?: InspectorAPI;
}

/**
 * Type for container with required inspector property.
 *
 * @internal
 */
export interface ContainerWithBuiltinAPIs extends InternalAccessible {
  readonly inspector: InspectorAPI;
}

/**
 * Attaches built-in inspector API to a container object.
 *
 * Uses Object.defineProperty to make the property non-enumerable and readonly.
 *
 * @param container - Container object that implements INTERNAL_ACCESS
 *
 * @internal
 */
export function attachBuiltinAPIs(
  container: AttachableContainer
): asserts container is ContainerWithBuiltinAPIs {
  if (stryMutAct_9fa48("931")) {
    {
    }
  } else {
    stryCov_9fa48("931");
    // Add built-in inspector API as non-enumerable property
    const inspectorAPI = createBuiltinInspectorAPI(container);
    Object.defineProperty(
      container,
      stryMutAct_9fa48("932") ? "" : (stryCov_9fa48("932"), "inspector"),
      stryMutAct_9fa48("933")
        ? {}
        : (stryCov_9fa48("933"),
          {
            value: inspectorAPI,
            writable: stryMutAct_9fa48("934") ? true : (stryCov_9fa48("934"), false),
            enumerable: stryMutAct_9fa48("935") ? true : (stryCov_9fa48("935"), false),
            configurable: stryMutAct_9fa48("936") ? true : (stryCov_9fa48("936"), false),
          })
    );
  }
}

// =============================================================================
// Child Container Creation Shared Logic
// =============================================================================

/**
 * Parses a child graph into overrides and extensions maps.
 *
 * @param childGraph - The child graph containing adapters
 * @returns Object with overrides and extensions Maps
 *
 * @internal
 */
export function parseChildGraph<
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  childGraph: TChildGraph
): {
  overrides: Map<Port<unknown, string>, RuntimeAdapter>;
  extensions: Map<Port<unknown, string>, RuntimeAdapter>;
} {
  if (stryMutAct_9fa48("937")) {
    {
    }
  } else {
    stryCov_9fa48("937");
    const overrides = new Map<Port<unknown, string>, RuntimeAdapter>();
    const extensions = new Map<Port<unknown, string>, RuntimeAdapter>();
    for (const adapter of childGraph.adapters) {
      if (stryMutAct_9fa48("938")) {
        {
        }
      } else {
        stryCov_9fa48("938");
        const portName = adapter.provides.__portName;
        if (
          stryMutAct_9fa48("940")
            ? false
            : stryMutAct_9fa48("939")
              ? true
              : (stryCov_9fa48("939", "940"), childGraph.overridePortNames.has(portName))
        ) {
          if (stryMutAct_9fa48("941")) {
            {
            }
          } else {
            stryCov_9fa48("941");
            // This is an override - replaces parent's adapter
            overrides.set(adapter.provides, adapter);
          }
        } else {
          if (stryMutAct_9fa48("942")) {
            {
            }
          } else {
            stryCov_9fa48("942");
            // This is an extension - new adapter not in parent
            extensions.set(adapter.provides, adapter);
          }
        }
      }
    }
    return stryMutAct_9fa48("943")
      ? {}
      : (stryCov_9fa48("943"),
        {
          overrides,
          extensions,
        });
  }
}

/**
 * Converts inheritance modes config object to Map.
 *
 * @param inheritanceModes - Optional per-port inheritance mode configuration
 * @returns Map of port names to inheritance modes
 *
 * @internal
 */
export function parseInheritanceModes<TProvides extends Port<unknown, string>>(
  inheritanceModes?: InheritanceModeConfig<TProvides>
): Map<string, InheritanceMode> {
  if (stryMutAct_9fa48("944")) {
    {
    }
  } else {
    stryCov_9fa48("944");
    const map = new Map<string, InheritanceMode>();
    if (
      stryMutAct_9fa48("947")
        ? inheritanceModes === undefined
        : stryMutAct_9fa48("946")
          ? false
          : stryMutAct_9fa48("945")
            ? true
            : (stryCov_9fa48("945", "946", "947"), inheritanceModes !== undefined)
    ) {
      if (stryMutAct_9fa48("948")) {
        {
        }
      } else {
        stryCov_9fa48("948");
        for (const [portName, mode] of Object.entries(inheritanceModes)) {
          if (stryMutAct_9fa48("949")) {
            {
            }
          } else {
            stryCov_9fa48("949");
            if (
              stryMutAct_9fa48("951")
                ? false
                : stryMutAct_9fa48("950")
                  ? true
                  : (stryCov_9fa48("950", "951"), isInheritanceMode(mode))
            ) {
              if (stryMutAct_9fa48("952")) {
                {
                }
              } else {
                stryCov_9fa48("952");
                map.set(portName, mode);
              }
            }
          }
        }
      }
    }
    return map;
  }
}

/**
 * Creates a ChildContainerConfig from parsed graph data.
 *
 * @internal
 */
export function createChildContainerConfig<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  parentLike: ParentContainerLike<TParentProvides, TAsyncPorts>,
  overrides: Map<Port<unknown, string>, RuntimeAdapter>,
  extensions: Map<Port<unknown, string>, RuntimeAdapter>,
  inheritanceModesMap: Map<string, InheritanceMode>,
  childName: string,
  parentName: string,
  performance?: RuntimePerformanceOptions
): ChildContainerConfig<TParentProvides, TAsyncPorts> {
  if (stryMutAct_9fa48("953")) {
    {
    }
  } else {
    stryCov_9fa48("953");
    const containerId = generateChildContainerId();
    return stryMutAct_9fa48("954")
      ? {}
      : (stryCov_9fa48("954"),
        {
          kind: stryMutAct_9fa48("955") ? "" : (stryCov_9fa48("955"), "child"),
          parent: parentLike,
          overrides,
          extensions,
          inheritanceModes: inheritanceModesMap,
          containerId,
          containerName: childName,
          parentContainerId: parentName,
          performance,
        });
  }
}
