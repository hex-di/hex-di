/**
 * Port Definitions for TaskFlow Data Layer
 *
 * Defines HexDI ports for:
 * - TaskApiService: CRUD operations for tasks
 * - CacheService: React Query cache coordination
 * - TaskFlowService: State machine for CRUD workflows
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { QueryClient } from "@tanstack/react-query";
import type { FlowService } from "@hex-di/flow";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskStats,
  Project,
  User,
  TaskFilterState,
} from "../types.js";

// =============================================================================
// Task API Service Interface
// =============================================================================

/**
 * Input for creating a new task.
 */
export interface CreateTaskInput {
  readonly title: string;
  readonly description?: string;
  readonly projectId: string;
  readonly priority: TaskPriority;
  readonly assigneeId?: string | null;
  readonly dueDate?: Date | null;
  readonly labels?: readonly string[];
}

/**
 * Input for updating an existing task.
 */
export interface UpdateTaskInput {
  readonly id: string;
  readonly title?: string;
  readonly description?: string | null;
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly assigneeId?: string | null;
  readonly dueDate?: Date | null;
  readonly labels?: readonly string[];
}

/**
 * Paginated result for task list queries.
 */
export interface PaginatedTaskResult {
  readonly tasks: readonly Task[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

/**
 * API service interface for task CRUD operations.
 *
 * This service abstracts the data access layer, allowing:
 * - Mock implementations for development/testing
 * - Real API implementations for production
 * - Easy swapping via HexDI container configuration
 */
export interface TaskApiService {
  /**
   * Fetch a paginated list of tasks with optional filters.
   *
   * @param filters - Filter criteria for the task list
   */
  getTasks(filters: TaskFilterState): Promise<PaginatedTaskResult>;

  /**
   * Fetch a single task by ID.
   *
   * @param id - The task ID
   * @returns The task or null if not found
   */
  getTask(id: string): Promise<Task | null>;

  /**
   * Get aggregated task statistics.
   *
   * @returns Task counts by status and due date
   */
  getTaskStats(): Promise<TaskStats>;

  /**
   * Create a new task.
   *
   * @param input - Task creation data
   * @returns The created task
   */
  createTask(input: CreateTaskInput): Promise<Task>;

  /**
   * Update an existing task.
   *
   * @param input - Task update data
   * @returns The updated task
   */
  updateTask(input: UpdateTaskInput): Promise<Task>;

  /**
   * Delete a task.
   *
   * @param id - The task ID to delete
   */
  deleteTask(id: string): Promise<void>;

  /**
   * Toggle task completion status.
   *
   * @param id - The task ID
   * @returns The updated task
   */
  toggleTaskComplete(id: string): Promise<Task>;

  /**
   * Fetch all projects.
   */
  getProjects(): Promise<readonly Project[]>;

  /**
   * Fetch all users (team members).
   */
  getUsers(): Promise<readonly User[]>;
}

/**
 * Port for the TaskApiService.
 *
 * This port provides access to task CRUD operations through the container.
 *
 * @example
 * ```typescript
 * const apiService = usePort(TaskApiServicePort);
 * const { tasks } = await apiService.getTasks({ status: 'todo', page: 1, pageSize: 10 });
 * ```
 */
export const TaskApiServicePort = createPort<"TaskApiService", TaskApiService>("TaskApiService");

// =============================================================================
// Cache Service Interface
// =============================================================================

/**
 * Cache service interface for React Query coordination.
 *
 * This service wraps React Query's QueryClient to provide a port-based
 * interface that can be invoked from flow machine effects.
 */
export interface TaskCacheService {
  /**
   * Invalidate all task list queries.
   */
  invalidateTasks(): Promise<void>;

  /**
   * Invalidate a specific task query.
   *
   * @param id - The task ID to invalidate
   */
  invalidateTask(id: string): Promise<void>;

  /**
   * Invalidate task stats query.
   */
  invalidateStats(): Promise<void>;

  /**
   * Set optimistic data for a task in the cache.
   *
   * @param task - The optimistic task data
   */
  setOptimisticTask(task: Task): void;

  /**
   * Remove a task from the cache (for optimistic delete).
   *
   * @param id - The task ID to remove
   */
  removeOptimisticTask(id: string): void;

  /**
   * Rollback to previous cache state.
   *
   * @param context - The previous data to restore
   */
  rollbackTask(context: { previousTasks?: readonly Task[]; previousTask?: Task | null }): void;

  /**
   * Get the underlying QueryClient for advanced operations.
   */
  getQueryClient(): QueryClient;
}

/**
 * Port for the TaskCacheService.
 *
 * This port provides access to React Query cache operations that can be
 * invoked from flow machine effects for cache coordination.
 *
 * @example
 * ```typescript
 * // In a flow machine effect:
 * Effect.invoke(TaskCacheServicePort, 'invalidateTasks', [])
 *
 * // After mutation:
 * Effect.sequence([
 *   Effect.invoke(TaskApiServicePort, 'createTask', [input]),
 *   Effect.invoke(TaskCacheServicePort, 'invalidateTasks', []),
 * ])
 * ```
 */
export const TaskCacheServicePort = createPort<"TaskCacheService", TaskCacheService>(
  "TaskCacheService"
);

// =============================================================================
// Task Flow Service Types
// =============================================================================

/**
 * Task CRUD workflow states.
 */
export type TaskFlowState =
  | "idle"
  | "loading"
  | "creating"
  | "updating"
  | "deleting"
  | "success"
  | "error";

/**
 * Task CRUD workflow events.
 */
export type TaskFlowEvent =
  | "LOAD"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "TOGGLE_COMPLETE"
  | "SUCCESS"
  | "ERROR"
  | "RESET"
  | "DISMISS";

/**
 * Context for the task flow state machine.
 */
export interface TaskFlowContext {
  /** The current operation type */
  readonly operation: "none" | "load" | "create" | "update" | "delete" | "toggle";
  /** The ID of the task being operated on (for update/delete/toggle) */
  readonly currentTaskId: string | null;
  /** Error message if operation failed */
  readonly error: string | null;
  /** The last successfully created/updated task */
  readonly lastResult: Task | null;
  /** Count of successful operations */
  readonly successCount: number;
}

/**
 * Type alias for the Task FlowService.
 */
export type TaskFlowService = FlowService<TaskFlowState, TaskFlowEvent, TaskFlowContext>;

/**
 * Port for the Task FlowService.
 *
 * This port provides access to the task CRUD workflow state machine.
 * The FlowService coordinates the workflow while React Query handles
 * data fetching and caching.
 *
 * @example
 * ```tsx
 * import { useMachine } from '@hex-di/flow-react';
 * import { useQuery, useMutation } from '@tanstack/react-query';
 * import { TaskFlowServicePort, TaskCacheServicePort } from './ports';
 *
 * function TaskList() {
 *   const { state, send } = useMachine(TaskFlowServicePort);
 *
 *   const createMutation = useMutation({
 *     mutationFn: createTask,
 *     onMutate: () => send({ type: 'CREATE' }),
 *     onSuccess: () => send({ type: 'SUCCESS' }),
 *     onError: (err) => send({ type: 'ERROR' }),
 *   });
 *
 *   return (
 *     <div>
 *       {state === 'creating' && <div>Creating...</div>}
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export const TaskFlowServicePort = createPort<"TaskFlowService", TaskFlowService>(
  "TaskFlowService"
);
