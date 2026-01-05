/**
 * Task CRUD Flow State Machine
 *
 * Coordinates task CRUD operations with React Query for cache management.
 * The machine handles workflow states while effects can trigger cache
 * invalidation via Effect.invoke on a CacheService port.
 *
 * States:
 * - idle: Ready for user interaction
 * - loading: Loading task data
 * - creating: Creating a new task
 * - updating: Updating an existing task
 * - deleting: Deleting a task
 * - success: Operation completed successfully
 * - error: Operation failed
 *
 * Events:
 * - LOAD: Load task data
 * - CREATE: Create a new task
 * - UPDATE: Update an existing task
 * - DELETE: Delete a task
 * - TOGGLE_COMPLETE: Toggle task completion status
 * - SUCCESS: Operation succeeded
 * - ERROR: Operation failed
 * - RESET: Return to idle state
 * - DISMISS: Dismiss error/success state
 *
 * @packageDocumentation
 */

import { createMachine, Effect, type Machine } from "@hex-di/flow";
import type { Task } from "../types.js";
import type { TaskFlowState, TaskFlowEvent, TaskFlowContext } from "./ports.js";

// =============================================================================
// Event Payloads
// =============================================================================

// Payload types for events with payloads
// Note: CreatePayload intentionally not used here as CREATE events
// are typically triggered without payload from the machine side

interface UpdatePayload {
  readonly id: string;
  readonly title?: string;
  readonly status?: string;
}

interface DeletePayload {
  readonly id: string;
}

interface ToggleCompletePayload {
  readonly id: string;
}

interface SuccessPayload {
  readonly task?: Task;
}

interface ErrorPayload {
  readonly message: string;
}

// =============================================================================
// Initial Context
// =============================================================================

const initialContext: TaskFlowContext = {
  operation: "none",
  currentTaskId: null,
  error: null,
  lastResult: null,
  successCount: 0,
};

// =============================================================================
// Machine Definition
// =============================================================================

/**
 * Task CRUD workflow state machine.
 *
 * Coordinates with React Query:
 * 1. User triggers CREATE/UPDATE/DELETE/TOGGLE_COMPLETE
 * 2. Machine transitions to operation state
 * 3. React Query mutation is executed
 * 4. On success, cache is invalidated and machine transitions to success
 * 5. Success state auto-transitions to idle after delay
 *
 * @example
 * ```typescript
 * // In a React component:
 * const { state, send } = useMachine(TaskFlowServicePort);
 *
 * const createMutation = useMutation({
 *   mutationFn: createTask,
 *   onMutate: () => send({ type: 'CREATE' }),
 *   onSuccess: (task) => send({ type: 'SUCCESS', payload: { task } }),
 *   onError: (err) => send({ type: 'ERROR', payload: { message: err.message } }),
 * });
 * ```
 */
export const taskFlowMachine: Machine<TaskFlowState, TaskFlowEvent, TaskFlowContext> =
  createMachine({
    id: "taskFlow",
    initial: "idle",
    context: initialContext,
    states: {
      // ==========================================================================
      // Idle State - Ready for interaction
      // ==========================================================================
      idle: {
        on: {
          LOAD: {
            target: "loading",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                operation: "load",
                error: null,
              }),
            ],
          },
          CREATE: {
            target: "creating",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                operation: "create",
                currentTaskId: null,
                error: null,
              }),
            ],
          },
          UPDATE: {
            target: "updating",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "UPDATE"; readonly payload: UpdatePayload }
              ): TaskFlowContext => ({
                ...ctx,
                operation: "update",
                currentTaskId: event.payload.id,
                error: null,
              }),
            ],
          },
          DELETE: {
            target: "deleting",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "DELETE"; readonly payload: DeletePayload }
              ): TaskFlowContext => ({
                ...ctx,
                operation: "delete",
                currentTaskId: event.payload.id,
                error: null,
              }),
            ],
          },
          TOGGLE_COMPLETE: {
            target: "updating",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "TOGGLE_COMPLETE"; readonly payload: ToggleCompletePayload }
              ): TaskFlowContext => ({
                ...ctx,
                operation: "toggle",
                currentTaskId: event.payload.id,
                error: null,
              }),
            ],
          },
        },
      },

      // ==========================================================================
      // Loading State - Fetching data
      // ==========================================================================
      loading: {
        on: {
          SUCCESS: {
            target: "idle",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                operation: "none",
                error: null,
              }),
            ],
          },
          ERROR: {
            target: "error",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "ERROR"; readonly payload: ErrorPayload }
              ): TaskFlowContext => ({
                ...ctx,
                error: event.payload.message,
              }),
            ],
          },
        },
      },

      // ==========================================================================
      // Creating State - Creating a new task
      // ==========================================================================
      creating: {
        on: {
          SUCCESS: {
            target: "success",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "SUCCESS"; readonly payload?: SuccessPayload }
              ): TaskFlowContext => ({
                ...ctx,
                lastResult: event.payload?.task ?? null,
                successCount: ctx.successCount + 1,
              }),
            ],
          },
          ERROR: {
            target: "error",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "ERROR"; readonly payload: ErrorPayload }
              ): TaskFlowContext => ({
                ...ctx,
                error: event.payload.message,
              }),
            ],
          },
        },
      },

      // ==========================================================================
      // Updating State - Updating an existing task
      // ==========================================================================
      updating: {
        on: {
          SUCCESS: {
            target: "success",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "SUCCESS"; readonly payload?: SuccessPayload }
              ): TaskFlowContext => ({
                ...ctx,
                lastResult: event.payload?.task ?? null,
                successCount: ctx.successCount + 1,
                currentTaskId: null,
              }),
            ],
          },
          ERROR: {
            target: "error",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "ERROR"; readonly payload: ErrorPayload }
              ): TaskFlowContext => ({
                ...ctx,
                error: event.payload.message,
              }),
            ],
          },
        },
      },

      // ==========================================================================
      // Deleting State - Deleting a task
      // ==========================================================================
      deleting: {
        on: {
          SUCCESS: {
            target: "success",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                lastResult: null,
                successCount: ctx.successCount + 1,
                currentTaskId: null,
              }),
            ],
          },
          ERROR: {
            target: "error",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "ERROR"; readonly payload: ErrorPayload }
              ): TaskFlowContext => ({
                ...ctx,
                error: event.payload.message,
              }),
            ],
          },
        },
      },

      // ==========================================================================
      // Success State - Operation completed
      // ==========================================================================
      success: {
        entry: [Effect.delay(2000)], // Auto-dismiss after 2 seconds
        on: {
          RESET: {
            target: "idle",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                operation: "none",
                currentTaskId: null,
                error: null,
              }),
            ],
          },
          DISMISS: {
            target: "idle",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                operation: "none",
                currentTaskId: null,
                error: null,
              }),
            ],
          },
          // Allow new operations from success state
          CREATE: {
            target: "creating",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                operation: "create",
                currentTaskId: null,
                error: null,
              }),
            ],
          },
          UPDATE: {
            target: "updating",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "UPDATE"; readonly payload: UpdatePayload }
              ): TaskFlowContext => ({
                ...ctx,
                operation: "update",
                currentTaskId: event.payload.id,
                error: null,
              }),
            ],
          },
          DELETE: {
            target: "deleting",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "DELETE"; readonly payload: DeletePayload }
              ): TaskFlowContext => ({
                ...ctx,
                operation: "delete",
                currentTaskId: event.payload.id,
                error: null,
              }),
            ],
          },
          TOGGLE_COMPLETE: {
            target: "updating",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "TOGGLE_COMPLETE"; readonly payload: ToggleCompletePayload }
              ): TaskFlowContext => ({
                ...ctx,
                operation: "toggle",
                currentTaskId: event.payload.id,
                error: null,
              }),
            ],
          },
        },
      },

      // ==========================================================================
      // Error State - Operation failed
      // ==========================================================================
      error: {
        on: {
          DISMISS: {
            target: "idle",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                error: null,
                currentTaskId: null,
                operation: "none",
              }),
            ],
          },
          RESET: {
            target: "idle",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                error: null,
                currentTaskId: null,
                operation: "none",
              }),
            ],
          },
          // Allow retry from error state
          CREATE: {
            target: "creating",
            actions: [
              (ctx: TaskFlowContext): TaskFlowContext => ({
                ...ctx,
                operation: "create",
                error: null,
              }),
            ],
          },
          UPDATE: {
            target: "updating",
            actions: [
              (
                ctx: TaskFlowContext,
                event: { readonly type: "UPDATE"; readonly payload: UpdatePayload }
              ): TaskFlowContext => ({
                ...ctx,
                operation: "update",
                currentTaskId: event.payload.id,
                error: null,
              }),
            ],
          },
        },
      },
    },
  });
