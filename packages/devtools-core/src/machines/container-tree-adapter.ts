/**
 * ContainerTree FlowAdapter
 *
 * FlowAdapter for the ContainerTreeMachine that integrates with HexDI.
 * Provides a FlowPort and adapter for DI registration.
 *
 * @packageDocumentation
 */

import { createFlowAdapter, createFlowPort, type FlowAdapter, type FlowPort } from "@hex-di/flow";
import {
  containerTreeMachine,
  type ContainerTreeState,
  type ContainerTreeContext,
  type ContainerTreeEvent,
} from "./container-tree.machine.js";

// =============================================================================
// Port Definition
// =============================================================================

/**
 * FlowPort for the ContainerTreeMachine.
 *
 * This port provides access to the ContainerTreeMachine's FlowService
 * from the HexDI container.
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

// =============================================================================
// Adapter Definition
// =============================================================================

/**
 * Type for the ContainerTreeFlowAdapter.
 */
export type ContainerTreeFlowAdapterType = FlowAdapter<
  typeof ContainerTreeFlowPort,
  readonly [],
  "scoped"
>;

/**
 * FlowAdapter for the ContainerTreeMachine.
 *
 * Creates a scoped FlowService for container hierarchy discovery and lifecycle.
 * Each scope gets its own ContainerTreeMachine instance.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { ContainerTreeFlowAdapter, ContainerTreeFlowPort } from "@hex-di/devtools";
 *
 * const graph = GraphBuilder.create()
 *   .provide(ContainerTreeFlowAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 * const scope = container.createScope();
 *
 * // Get the ContainerTree FlowService
 * const containerTreeFlow = scope.resolve(ContainerTreeFlowPort);
 *
 * // Dispatch events
 * containerTreeFlow.send({ type: "DISCOVER" });
 * ```
 */
export const ContainerTreeFlowAdapter: ContainerTreeFlowAdapterType = createFlowAdapter({
  provides: ContainerTreeFlowPort,
  requires: [] as const,
  lifetime: "scoped",
  machine: containerTreeMachine,
});
