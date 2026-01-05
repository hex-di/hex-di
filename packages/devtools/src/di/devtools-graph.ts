/**
 * DevTools DI Graph Structure
 *
 * GraphBuilder configuration for the DevTools package.
 * Provides the DI graph that wires together all DevTools adapters.
 *
 * @packageDocumentation
 */

import { GraphBuilder, type Graph } from "@hex-di/graph";
import { createFlowPort, createFlowAdapter, type FlowPort } from "@hex-di/flow";
import {
  devToolsUIMachine,
  type DevToolsUIState,
  type DevToolsUIEvent,
  type DevToolsUIContext,
  tracingMachine,
  type TracingState,
  type TracingEvent,
  type TracingContext,
  containerTreeMachine,
  type ContainerTreeState,
  type ContainerTreeEvent,
  type ContainerTreeContext,
} from "@hex-di/devtools-core";

// =============================================================================
// Flow Ports for Each Machine
// =============================================================================

/**
 * FlowPort for the ContainerTree machine.
 *
 * Provides access to the container discovery and hierarchy state machine.
 */
export const ContainerTreeFlowPort: FlowPort<
  ContainerTreeState,
  ContainerTreeEvent,
  ContainerTreeContext,
  "ContainerTreeFlow"
> = createFlowPort<
  ContainerTreeState,
  ContainerTreeEvent,
  ContainerTreeContext,
  "ContainerTreeFlow"
>("ContainerTreeFlow");

/**
 * FlowPort for the Tracing machine.
 *
 * Provides access to the trace collection state machine.
 */
export const TracingFlowPort: FlowPort<TracingState, TracingEvent, TracingContext, "TracingFlow"> =
  createFlowPort<TracingState, TracingEvent, TracingContext, "TracingFlow">("TracingFlow");

/**
 * FlowPort for the UI machine.
 *
 * Provides access to the DevTools UI state machine.
 */
export const UIFlowPort: FlowPort<DevToolsUIState, DevToolsUIEvent, DevToolsUIContext, "UIFlow"> =
  createFlowPort<DevToolsUIState, DevToolsUIEvent, DevToolsUIContext, "UIFlow">("UIFlow");

// =============================================================================
// Flow Adapters for Each Machine
// =============================================================================

/**
 * FlowAdapter for the ContainerTree machine.
 *
 * Creates a scoped FlowService for container discovery.
 */
export const ContainerTreeFlowAdapter = createFlowAdapter({
  provides: ContainerTreeFlowPort,
  requires: [] as const,
  machine: containerTreeMachine,
  lifetime: "scoped",
});

/**
 * FlowAdapter for the Tracing machine.
 *
 * Creates a scoped FlowService for trace collection.
 */
export const TracingFlowAdapter = createFlowAdapter({
  provides: TracingFlowPort,
  requires: [] as const,
  machine: tracingMachine,
  lifetime: "scoped",
});

/**
 * FlowAdapter for the UI machine.
 *
 * Creates a scoped FlowService for UI state management.
 */
export const UIFlowAdapter = createFlowAdapter({
  provides: UIFlowPort,
  requires: [] as const,
  machine: devToolsUIMachine,
  lifetime: "scoped",
});

// =============================================================================
// DevTools Graph Builder
// =============================================================================

/**
 * Creates a DevTools graph with all flow adapters registered.
 *
 * This graph provides FlowService instances for:
 * - ContainerTree machine (container discovery)
 * - Tracing machine (trace collection)
 * - UI machine (panel state management)
 *
 * @returns A Graph with all DevTools adapters
 *
 * @remarks
 * This graph is intended to be composed with other graphs in the application.
 * The DevToolsFlowRuntime coordinates these services at a higher level.
 *
 * @example
 * ```typescript
 * import { createDevToolsGraph } from "./devtools-graph.js";
 * import { createContainer } from "@hex-di/runtime";
 *
 * const devToolsGraph = createDevToolsGraph();
 * const container = createContainer(devToolsGraph);
 *
 * // Resolve individual flow services
 * const scope = container.createScope();
 * const uiFlow = scope.resolve(UIFlowPort);
 * ```
 */
export function createDevToolsGraph(): Graph<
  typeof ContainerTreeFlowPort | typeof TracingFlowPort | typeof UIFlowPort
> {
  return GraphBuilder.create()
    .provide(ContainerTreeFlowAdapter)
    .provide(TracingFlowAdapter)
    .provide(UIFlowAdapter)
    .build();
}

// =============================================================================
// Export All Ports and Adapters
// =============================================================================

export {
  // Re-export types for convenience
  type DevToolsUIState,
  type DevToolsUIEvent,
  type DevToolsUIContext,
  type TracingState,
  type TracingEvent,
  type TracingContext,
  type ContainerTreeState,
  type ContainerTreeEvent,
  type ContainerTreeContext,
};
