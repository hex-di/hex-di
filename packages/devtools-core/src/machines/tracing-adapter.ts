/**
 * Tracing FlowAdapter
 *
 * FlowAdapter for the TracingMachine that integrates with HexDI.
 * Provides a FlowPort and adapter for DI registration.
 *
 * @packageDocumentation
 */

import { createFlowAdapter, createFlowPort, type FlowAdapter, type FlowPort } from "@hex-di/flow";
import {
  tracingMachine,
  type TracingState,
  type TracingContext,
  type TracingEvent,
} from "./tracing.machine.js";

// =============================================================================
// Port Definition
// =============================================================================

/**
 * FlowPort for the TracingMachine.
 *
 * This port provides access to the TracingMachine's FlowService
 * from the HexDI container.
 */
export const TracingFlowPort: FlowPort<TracingState, TracingEvent, TracingContext, "TracingFlow"> =
  createFlowPort<TracingState, TracingEvent, TracingContext, "TracingFlow">("TracingFlow");

// =============================================================================
// Adapter Definition
// =============================================================================

/**
 * Type for the TracingFlowAdapter.
 */
export type TracingFlowAdapterType = FlowAdapter<typeof TracingFlowPort, readonly [], "scoped">;

/**
 * FlowAdapter for the TracingMachine.
 *
 * Creates a scoped FlowService for trace collection and display.
 * Each scope gets its own TracingMachine instance.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { TracingFlowAdapter, TracingFlowPort } from "@hex-di/devtools";
 *
 * const graph = GraphBuilder.create()
 *   .provide(TracingFlowAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 * const scope = container.createScope();
 *
 * // Get the Tracing FlowService
 * const tracingFlow = scope.resolve(TracingFlowPort);
 *
 * // Dispatch events
 * tracingFlow.send({ type: "ENABLE" });
 * tracingFlow.send({ type: "START" });
 * ```
 */
export const TracingFlowAdapter: TracingFlowAdapterType = createFlowAdapter({
  provides: TracingFlowPort,
  requires: [] as const,
  lifetime: "scoped",
  machine: tracingMachine,
});
