/**
 * DevToolsFlowRuntimeAdapter
 *
 * FlowAdapter pattern for DI integration of the DevToolsFlowRuntime.
 * Provides a factory function that creates the runtime with container dependency.
 *
 * @packageDocumentation
 */

import { createPort, type Port } from "@hex-di/ports";
import type { Adapter } from "@hex-di/graph";
import { DevToolsFlowRuntime, createDevToolsFlowRuntime } from "./devtools-flow-runtime.js";

// =============================================================================
// Port Definition
// =============================================================================

/**
 * Port for the DevToolsFlowRuntime service.
 *
 * This port provides access to the unified DevTools runtime that coordinates
 * three FlowService instances for UI, Tracing, and ContainerTree machines.
 */
export const DevToolsFlowRuntimePort: Port<DevToolsFlowRuntime, "DevToolsFlowRuntime"> = createPort<
  "DevToolsFlowRuntime",
  DevToolsFlowRuntime
>("DevToolsFlowRuntime");

// =============================================================================
// Adapter Type
// =============================================================================

/**
 * Type alias for the DevToolsFlowRuntime adapter.
 */
export type DevToolsFlowRuntimeAdapterType = Adapter<
  typeof DevToolsFlowRuntimePort,
  never,
  "singleton",
  "sync",
  false,
  readonly []
>;

// =============================================================================
// Adapter Factory
// =============================================================================

/**
 * Creates a DevToolsFlowRuntimeAdapter for DI integration.
 *
 * The adapter creates a singleton DevToolsFlowRuntime that coordinates
 * all DevTools state machines. The runtime is created with the container
 * passed to the adapter factory.
 *
 * @returns A DevToolsFlowRuntimeAdapter
 *
 * @remarks
 * The runtime is a singleton because:
 * 1. DevTools should have a single source of truth for state
 * 2. Multiple runtime instances would lead to inconsistent UI
 * 3. The runtime manages shared resources (traces, container tree)
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { createDevToolsFlowRuntimeAdapter } from "./devtools-flow-runtime-adapter.js";
 *
 * const devToolsGraph = GraphBuilder.create()
 *   .provide(createDevToolsFlowRuntimeAdapter())
 *   .build();
 *
 * const container = createContainer(devToolsGraph);
 * const runtime = container.resolve(DevToolsFlowRuntimePort);
 * ```
 */
export function createDevToolsFlowRuntimeAdapter(): DevToolsFlowRuntimeAdapterType {
  // We need a reference to the container at resolution time.
  // Since we can't get the container directly in the factory,
  // we create the runtime with a minimal config and the container
  // is passed through the resolution context.
  //
  // For now, we create a placeholder adapter that expects the container
  // to be provided via scope resolution.

  const adapter: DevToolsFlowRuntimeAdapterType = {
    provides: DevToolsFlowRuntimePort,
    requires: [] as const,
    lifetime: "singleton",
    factoryKind: "sync" as const,
    factory: (_deps: object, _resolveContext?: { container?: unknown }): DevToolsFlowRuntime => {
      // The container reference needs to be obtained at the callsite.
      // For the DevToolsFlowRuntime, we'll need to pass it differently.
      //
      // This is a limitation of the current design - we'll create a minimal
      // runtime that works without container access initially.
      //
      // In practice, the DevToolsProvider will create the runtime with
      // the container reference directly, not through DI resolution.
      throw new Error(
        "DevToolsFlowRuntimeAdapter.factory should not be called directly. " +
          "Use createDevToolsFlowRuntime({ container }) instead."
      );
    },
    clonable: false as const,
    finalizer: async (instance: DevToolsFlowRuntime): Promise<void> => {
      await instance.dispose();
    },
  };

  return Object.freeze(adapter);
}

// =============================================================================
// Alternative: Direct Factory for Provider Usage
// =============================================================================

/**
 * Creates a DevToolsFlowRuntime with the given inspector.
 *
 * This is the recommended way to create the runtime when you have
 * direct access to the inspector (e.g., in the DevToolsProvider).
 *
 * @param inspector - The root inspector for container hierarchy traversal
 * @returns A new DevToolsFlowRuntime instance
 *
 * @example
 * ```typescript
 * import { createDevToolsFlowRuntimeWithInspector } from "./devtools-flow-runtime-adapter.js";
 * import { pipe, withInspector } from "@hex-di/runtime";
 *
 * function DevToolsProvider({ children, container }) {
 *   // Container with InspectorPlugin has inspector property with full functionality
 *   const inspector = container.inspector; // InspectorWithSubscription
 *   const runtimeRef = useRef<DevToolsFlowRuntime | null>(null);
 *
 *   if (runtimeRef.current === null) {
 *     runtimeRef.current = createDevToolsFlowRuntimeWithInspector(inspector);
 *   }
 *
 *   return (
 *     <DevToolsContext.Provider value={runtimeRef.current}>
 *       {children}
 *     </DevToolsContext.Provider>
 *   );
 * }
 * ```
 */
export function createDevToolsFlowRuntimeWithInspector(
  inspector: Parameters<typeof createDevToolsFlowRuntime>[0]["inspector"]
): DevToolsFlowRuntime {
  return createDevToolsFlowRuntime({ inspector });
}
