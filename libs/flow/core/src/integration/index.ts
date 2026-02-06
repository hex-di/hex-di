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
  type ScopeResolver,
} from "./di-executor.js";

// =============================================================================
// Flow Adapter
// =============================================================================

export {
  createFlowAdapter,
  type FlowAdapterConfig,
  type FlowAdapter,
  type ActivityRegistry,
  type ActivityDepsResolver,
} from "./adapter.js";

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
