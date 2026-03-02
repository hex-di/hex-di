/**
 * @hex-di/saga - Saga orchestration for HexDI
 *
 * Typed multi-step transactions with compensation, persistence,
 * and container integration.
 *
 * @packageDocumentation
 */

// =============================================================================
// Step Definitions
// =============================================================================

export { defineStep } from "./step/index.js";

export type {
  StepDefinition,
  AnyStepDefinition,
  StepContext,
  CompensationContext,
  RetryConfig,
  StepOptions,
  InferStepName,
  InferStepOutput,
  InferStepInput,
  InferStepError,
  InferStepPort,
  NotAStepDefinitionError,
  CollectStepPorts,
  ValidateSagaPorts,
  MissingSagaStepPortsError,
} from "./step/index.js";

// =============================================================================
// Saga Definitions
// =============================================================================

export { defineSaga } from "./saga/index.js";

export type {
  SagaDefinition,
  AnySagaDefinition,
  SagaOptions,
  SagaHooks,
  StepHookContext,
  StepHookResultContext,
  CompensationHookContext,
  CompensationResultHookContext,
  AccumulatedResults,
  AccumulatedErrors,
  BranchAccumulatedResults,
  BranchAccumulatedErrors,
  CheckpointPolicy,
  InferSagaName,
  InferSagaInput,
  InferSagaOutput,
  InferSagaSteps,
  InferSagaErrors,
  InferStepOutputByName,
  NotASagaDefinitionError,
  HasStepName,
  StepNameAlreadyExistsError,
} from "./saga/index.js";

// =============================================================================
// Ports
// =============================================================================

export {
  sagaPort,
  sagaManagementPort,
  SagaPersisterPort,
  SagaRegistryPort,
  SagaInspectorPort,
  isSagaPort,
  isSagaManagementPort,
} from "./ports/index.js";

export type {
  SagaPort,
  SagaManagementPort,
  SagaPortConfig,
  SagaExecutor,
  SagaManagementExecutor,
  ExecutionFilters,
  SagaExecutionSummary,
  SagaPersister,
  SagaExecutionState,
  CompletedStepState,
  CompensationState,
  SerializedSagaError,
  PersistenceError,
  PersisterFilters,
  NotASagaPortError,
  NotASagaManagementPortError,
  InferSagaPortInput,
  InferSagaPortOutput,
  InferSagaPortError,
  InferSagaPortName,
  InferSagaManagementPortOutput,
  InferSagaManagementPortError,
  InferSagaManagementPortName,
  CaptiveSagaDependencyError,
} from "./ports/index.js";

// =============================================================================
// Adapters
// =============================================================================

export { createSagaAdapter } from "./adapters/index.js";

export type { SagaAdapter, SagaAdapterConfig } from "./adapters/index.js";

// =============================================================================
// Compensation
// =============================================================================

export { executeCompensation } from "./compensation/index.js";

export type {
  CompensationStrategy,
  CompensationResult,
  CompensationStepError,
  CompensationPlan,
  CompensationPlanStep,
  CompensationInvoker,
  DeadLetterEntry,
} from "./compensation/index.js";

// =============================================================================
// Runtime
// =============================================================================

export {
  createSagaRunner,
  executeSaga,
  generateExecutionId,
  DeadLetterQueue,
} from "./runtime/index.js";

export type {
  SagaRunnerConfig,
  SagaRunner,
  ExecuteOptions,
  PortResolver,
  SagaEventBase,
  SagaEvent,
  SagaEventListener,
  Unsubscribe,
  SagaStartedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  StepFailedEvent,
  StepSkippedEvent,
  StepResumedEvent,
  CheckpointWarningEvent,
  CompensationStartedEvent,
  CompensationStepEvent,
  CompensationCompletedEvent,
  CompensationFailedEvent,
  SagaCompletedEvent,
  SagaFailedEvent,
  SagaCancelledEvent,
  SagaProgressEvent,
  SagaCompensationEvent,
  ExecutionTrace,
  StepTrace,
  CompensationTrace,
  CompensationStepTrace,
  CheckpointError,
} from "./runtime/index.js";

// =============================================================================
// Integration (DI Executor Factories)
// =============================================================================

export {
  createSagaExecutor,
  createSagaManagementExecutor,
  createSagaLibraryInspector,
  createSagaInspectorAdapter,
  SagaRegistryAdapter,
  SagaLibraryInspectorPort,
  SagaLibraryInspectorAdapter,
} from "./integration/index.js";

export type { SagaInspectorAdapterConfig } from "./integration/index.js";

// =============================================================================
// Introspection
// =============================================================================

export {
  createSagaInspector,
  emitToInspector,
  createSagaRegistry,
  createSagaTracingHook,
} from "./introspection/index.js";

export type {
  SagaInspector,
  SagaInspectorConfig,
  SagaDefinitionInfo,
  StepDefinitionInfo,
  RetryPolicyInfo,
  InspectorSagaExecutionSummary,
  CompensationStats,
  SagaCompensationBreakdown,
  SagaRegistry,
  SagaRegistryEntry,
  SagaRegistryEvent,
  SagaRegistryListener,
  SagaSuggestion,
  SagaSuggestionType,
  TracerLike,
  SagaTracingHookOptions,
  SagaTracingHook,
} from "./introspection/index.js";

// =============================================================================
// Persistence
// =============================================================================

export { createInMemoryPersister } from "./persistence/index.js";

// =============================================================================
// Error Types
// =============================================================================

export {
  createStepFailedError,
  createCompensationFailedError,
  createTimeoutError,
  createCancelledError,
  createValidationFailedError,
  createPortNotFoundError,
  createPersistenceFailedError,
} from "./errors/index.js";

export type {
  SagaErrorBase,
  StepFailedError,
  CompensationFailedError,
  TimeoutError,
  CancelledError,
  ValidationFailedError,
  PortNotFoundError,
  PersistenceFailedError,
  SagaError,
  SagaSuccess,
  ManagementError,
  SagaStatusType,
  SagaStatus,
} from "./errors/index.js";
