/**
 * TaskFlow Data Layer Module
 *
 * Provides React Query integration with HexDI for task management:
 * - Mock data generators for development
 * - Type-safe ports for API and cache services
 * - Adapters for HexDI container integration
 * - React Query hooks with optimistic updates
 * - Flow machine for CRUD workflow coordination
 *
 * @packageDocumentation
 */

// =============================================================================
// Mock Data
// =============================================================================

export {
  // Generators
  generateMockDataSet,
  generateUser,
  generateUsers,
  generateTeam,
  generateProject,
  generateProjects,
  generateTask,
  generateTasks,
  // Utilities
  resetIdCounters,
  simulateNetworkDelay,
  getRandomDelay,
  // Constants
  MOCK_DELAY_RANGE,
  // Default data
  defaultMockData,
  // Types
  type MockDataSet,
} from "./mock-data.js";

// =============================================================================
// Ports
// =============================================================================

export {
  // Task API Service
  TaskApiServicePort,
  type TaskApiService,
  type CreateTaskInput,
  type UpdateTaskInput,
  type PaginatedTaskResult,
  // Cache Service
  TaskCacheServicePort,
  type TaskCacheService,
  // Flow Service
  TaskFlowServicePort,
  type TaskFlowService,
  type TaskFlowState,
  type TaskFlowEvent,
  type TaskFlowContext,
} from "./ports.js";

// =============================================================================
// Adapters
// =============================================================================

export {
  TaskApiServiceAdapter,
  createTaskCacheServiceAdapter,
  TaskFlowServiceAdapter,
} from "./adapters.js";

// =============================================================================
// Machine
// =============================================================================

export { taskFlowMachine } from "./machine.js";

// =============================================================================
// Hooks
// =============================================================================

export {
  // Query hooks
  useTaskList,
  useTask,
  useTaskStats,
  useProjects,
  useUsers,
  // Mutation hooks
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskComplete,
  // Types
  type UseTaskListOptions,
  type UseTaskOptions,
} from "./hooks.js";

// =============================================================================
// Flow-Integrated Hooks
// =============================================================================

export {
  // Flow-aware mutation hooks
  useCreateTaskWithFlow,
  useUpdateTaskWithFlow,
  useDeleteTaskWithFlow,
  useToggleTaskCompleteWithFlow,
  // Flow state hook
  useTaskFlowState,
  // Types
  type FlowAwareMutationResult,
} from "./hooks-with-flow.js";
