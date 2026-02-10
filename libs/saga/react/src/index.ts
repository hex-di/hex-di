/**
 * @hex-di/saga-react - React Integration for @hex-di/saga
 *
 * Provides type-safe React hooks and components for executing, monitoring,
 * and recovering sagas within React applications.
 *
 * All hooks resolve services from the nearest HexDiContainerProvider.
 *
 * @packageDocumentation
 */

// =============================================================================
// Context / Provider
// =============================================================================

export {
  SagaManagementContext,
  SagaManagementProvider,
  useSagaManagementExecutor,
  type SagaManagementProviderProps,
} from "./context/saga-management-context.js";

// =============================================================================
// Hooks
// =============================================================================

export { useSaga, type UseSagaResult, type UseSagaStatus } from "./hooks/index.js";

export { useSagaStatus, type SagaStatusResult, type SagaStatusHookStatus } from "./hooks/index.js";

export { useSagaHistory, type SagaHistoryResult, type SagaHistoryOptions } from "./hooks/index.js";

// =============================================================================
// Components
// =============================================================================

export {
  SagaBoundary,
  type SagaBoundaryProps,
  type SagaBoundaryFallbackProps,
} from "./components/saga-boundary.js";

// =============================================================================
// Re-exports from @hex-di/saga
// =============================================================================

export type {
  SagaPort,
  SagaManagementPort,
  SagaExecutor,
  SagaManagementExecutor,
  SagaSuccess,
  SagaError,
  SagaStatus,
  InferSagaPortInput,
  InferSagaPortOutput,
  InferSagaPortError,
} from "@hex-di/saga";

// =============================================================================
// Re-exports from @hex-di/react
// =============================================================================

export { HexDiContainerProvider } from "@hex-di/react";
