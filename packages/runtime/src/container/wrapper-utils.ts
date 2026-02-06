/**
 * Shared wrapper utilities for container creation.
 * @packageDocumentation
 */

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
  // Add built-in inspector API as non-enumerable property
  const inspectorAPI = createBuiltinInspectorAPI(container);
  Object.defineProperty(container, "inspector", {
    value: inspectorAPI,
    writable: false,
    enumerable: false,
    configurable: false,
  });
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
  const overrides = new Map<Port<unknown, string>, RuntimeAdapter>();
  const extensions = new Map<Port<unknown, string>, RuntimeAdapter>();

  for (const adapter of childGraph.adapters) {
    const portName = adapter.provides.__portName;
    if (childGraph.overridePortNames.has(portName)) {
      // This is an override - replaces parent's adapter
      overrides.set(adapter.provides, adapter);
    } else {
      // This is an extension - new adapter not in parent
      extensions.set(adapter.provides, adapter);
    }
  }

  return { overrides, extensions };
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
  const map = new Map<string, InheritanceMode>();
  if (inheritanceModes !== undefined) {
    for (const [portName, mode] of Object.entries(inheritanceModes)) {
      if (isInheritanceMode(mode)) {
        map.set(portName, mode);
      }
    }
  }
  return map;
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
  const containerId = generateChildContainerId();

  return {
    kind: "child",
    parent: parentLike,
    overrides,
    extensions,
    inheritanceModes: inheritanceModesMap,
    containerId,
    containerName: childName,
    parentContainerId: parentName,
    performance,
  };
}
