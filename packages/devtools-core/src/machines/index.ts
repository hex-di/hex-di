/**
 * DevTools State Machines
 *
 * HexDI Flow state machines for DevTools:
 * - DevToolsUIMachine: Global UI state (panel, tabs, selection)
 * - TracingMachine: Global trace collection and filtering
 * - ContainerTreeMachine: Container discovery and hierarchy management
 *
 * Each machine has a corresponding FlowAdapter for HexDI integration:
 * - UIFlowAdapter: Provides UIFlowPort for UI state
 * - TracingFlowAdapter: Provides TracingFlowPort for tracing state
 * - ContainerTreeFlowAdapter: Provides ContainerTreeFlowPort for container discovery
 *
 * @packageDocumentation
 */

// =============================================================================
// Machine Definitions
// =============================================================================

export * from "./devtools-ui.machine.js";
export * from "./tracing.machine.js";
export * from "./container-tree.machine.js";

// =============================================================================
// FlowAdapters and Ports
// =============================================================================

export {
  ContainerTreeFlowPort,
  ContainerTreeFlowAdapter,
  type ContainerTreeFlowAdapterType,
} from "./container-tree-adapter.js";

export {
  TracingFlowPort,
  TracingFlowAdapter,
  type TracingFlowAdapterType,
} from "./tracing-adapter.js";

export { UIFlowPort, UIFlowAdapter, type UIFlowAdapterType } from "./ui-adapter.js";
