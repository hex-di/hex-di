/**
 * Shared wrapper utilities for container creation.
 * @packageDocumentation
 */

import type { TracingAPI } from "@hex-di/core";
import type { InspectorAPI } from "../inspection/types.js";
import { createBuiltinInspectorAPI, createBuiltinTracerAPI } from "../inspection/builtin-api.js";
import type { InternalAccessible } from "../inspection/creation.js";

// =============================================================================
// Builtin API Attachment Helper
// =============================================================================

/**
 * Type for container objects that support INTERNAL_ACCESS and can have
 * inspector/tracer attached.
 *
 * @internal
 */
export interface AttachableContainer extends InternalAccessible {
  inspector?: InspectorAPI;
  tracer?: TracingAPI;
}

/**
 * Type for container with required inspector and tracer properties.
 *
 * @internal
 */
export interface ContainerWithBuiltinAPIs extends InternalAccessible {
  readonly inspector: InspectorAPI;
  readonly tracer: TracingAPI;
}

/**
 * Attaches built-in inspector and tracer APIs to a container object.
 *
 * Uses Object.defineProperty to make properties non-enumerable and readonly.
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

  // Add built-in tracer API as non-enumerable property
  const tracerAPI = createBuiltinTracerAPI();
  Object.defineProperty(container, "tracer", {
    value: tracerAPI,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}
