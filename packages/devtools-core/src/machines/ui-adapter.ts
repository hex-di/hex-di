/**
 * DevTools UI FlowAdapter
 *
 * FlowAdapter for the DevToolsUIMachine that integrates with HexDI.
 * Provides a FlowPort and adapter for DI registration.
 *
 * @packageDocumentation
 */

import { createFlowAdapter, createFlowPort, type FlowAdapter, type FlowPort } from "@hex-di/flow";
import {
  devToolsUIMachine,
  type DevToolsUIState,
  type DevToolsUIContext,
  type DevToolsUIEvent,
} from "./devtools-ui.machine.js";

// =============================================================================
// Port Definition
// =============================================================================

/**
 * FlowPort for the DevToolsUIMachine.
 *
 * This port provides access to the DevToolsUIMachine's FlowService
 * from the HexDI container.
 */
export const UIFlowPort: FlowPort<DevToolsUIState, DevToolsUIEvent, DevToolsUIContext, "UIFlow"> =
  createFlowPort<DevToolsUIState, DevToolsUIEvent, DevToolsUIContext, "UIFlow">("UIFlow");

// =============================================================================
// Adapter Definition
// =============================================================================

/**
 * Type for the UIFlowAdapter.
 */
export type UIFlowAdapterType = FlowAdapter<typeof UIFlowPort, readonly [], "scoped">;

/**
 * FlowAdapter for the DevToolsUIMachine.
 *
 * Creates a scoped FlowService for DevTools panel UI state management.
 * Each scope gets its own DevToolsUIMachine instance.
 *
 * @remarks
 * The DevToolsUIMachine handles:
 * - Panel open/close state
 * - Tab selection
 * - Container selection
 * - Panel sizing and positioning
 * - localStorage persistence for user preferences
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { UIFlowAdapter, UIFlowPort } from "@hex-di/devtools";
 *
 * const graph = GraphBuilder.create()
 *   .provide(UIFlowAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 * const scope = container.createScope();
 *
 * // Get the UI FlowService
 * const uiFlow = scope.resolve(UIFlowPort);
 *
 * // Dispatch events
 * uiFlow.send({ type: "OPEN" });
 * uiFlow.send({ type: "SELECT_TAB", payload: { tab: "traces" } });
 * ```
 */
export const UIFlowAdapter: UIFlowAdapterType = createFlowAdapter({
  provides: UIFlowPort,
  requires: [] as const,
  lifetime: "scoped",
  machine: devToolsUIMachine,
});
