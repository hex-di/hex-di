/**
 * HexDI Integration Module
 *
 * This module provides integration with HexDI containers:
 * - FlowService: Wrapper interface for MachineRunner
 * - DIEffectExecutor: Effect executor that resolves ports from scope
 * - createFlowAdapter: Factory for creating HexDI adapters
 * - createFlowPort: Factory for creating FlowService port tokens
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  FlowService,
  FlowServiceAny,
  InferFlowServiceState,
  InferFlowServiceEvent,
  InferFlowServiceContext,
  ScopeResolver,
  ActivityRegistry,
  ActivityDepsResolver,
} from "./types.js";

export {
  FlowInspectorPort,
  FlowRegistryPort,
  FlowLibraryInspectorPort,
  FlowEventBusPort,
} from "./types.js";

// =============================================================================
// Port Factory
// =============================================================================

export { createFlowPort, type FlowPort } from "./port.js";

// =============================================================================
// DI Effect Executor
// =============================================================================

export {
  createDIEffectExecutor,
  type DIEffectExecutor,
  type DIEffectExecutorConfig,
} from "./di-executor.js";

// =============================================================================
// Flow Adapter
// =============================================================================

export { createFlowAdapter, type FlowAdapterConfig, type FlowAdapter } from "./adapter.js";

// =============================================================================
// Metadata
// =============================================================================

export {
  computeFlowMetadata,
  isFlowMetadata,
  type FlowAdapterMetadata,
  type TransitionDetail,
} from "./metadata.js";

// =============================================================================
// Activity Validation (Type-level utilities)
// =============================================================================

export type {
  ValidateActivityRequirements,
  AssertActivityRequirements,
  AssertUniqueActivityPorts,
  ValidateActivities,
  PortNamesUnion,
  ActivityRequiresUnavailablePortError,
  DuplicateActivityPortError,
} from "./activity-validation.js";

// =============================================================================
// FlowRegistry Adapter
// =============================================================================

export { FlowRegistryAdapter } from "./registry-adapter.js";

// =============================================================================
// FlowEventBus Adapter
// =============================================================================

export { FlowEventBusAdapter } from "./event-bus-adapter.js";

// =============================================================================
// FlowInspector Adapter
// =============================================================================

export {
  createFlowInspectorAdapter,
  type FlowInspectorAdapterConfig,
} from "./inspector-adapter.js";

// =============================================================================
// Tracing Bridge
// =============================================================================

export { createFlowTracingBridge, type FlowTracingBridgeConfig } from "./tracing-bridge.js";

// =============================================================================
// Library Inspector Bridge
// =============================================================================

export { createFlowLibraryInspector } from "./library-inspector-bridge.js";

// =============================================================================
// Library Inspector Adapter
// =============================================================================

export { FlowLibraryInspectorAdapter } from "./library-inspector-adapter.js";
