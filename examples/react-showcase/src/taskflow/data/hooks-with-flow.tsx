/**
 * React Query Hooks with Flow Machine Integration
 *
 * These hooks coordinate React Query mutations with the Task Flow state machine,
 * providing a unified state management experience where:
 * - React Query handles data fetching and caching
 * - Flow machine handles workflow state (creating, updating, deleting, error)
 * - Mutations trigger flow state transitions
 *
 * @packageDocumentation
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMachine } from "@hex-di/flow-react";
import { usePort } from "@hex-di/react";
import { queryKeys } from "../query-client.js";
import {
  TaskApiServicePort,
  TaskCacheServicePort,
  TaskFlowServicePort,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "./ports.js";
import type { Task } from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Extended mutation result that includes flow state.
 */
export interface FlowAwareMutationResult<TData, TError, TVariables> {
  /** The mutation function */
  readonly mutate: (variables: TVariables) => void;
  /** The async mutation function */
  readonly mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Whether the mutation is pending */
  readonly isPending: boolean;
  /** The error if mutation failed */
  readonly error: TError | null;
  /** The data if mutation succeeded */
  readonly data: TData | undefined;
  /** The current flow state */
  readonly flowState: string;
  /** The flow context */
  readonly flowContext: {
    readonly operation: string;
    readonly currentTaskId: string | null;
    readonly error: string | null;
    readonly lastResult: Task | null;
    readonly successCount: number;
  };
  /** Reset the flow state to idle */
  readonly resetFlow: () => void;
}

// =============================================================================
// Flow-Aware Mutation Hooks
// =============================================================================

/**
 * Hook for creating a task with flow machine integration.
 *
 * Coordinates with the TaskFlow state machine to track workflow state.
 * Flow state transitions:
 * - idle -> creating (on mutate)
 * - creating -> success (on mutation success)
 * - creating -> error (on mutation error)
 * - success/error -> idle (on reset/dismiss)
 *
 * @example
 * ```tsx
 * function CreateTaskButton() {
 *   const { mutate, isPending, flowState, flowContext } = useCreateTaskWithFlow();
 *
 *   return (
 *     <div>
 *       <button onClick={() => mutate({ title: 'New Task', projectId: 'proj-1', priority: 'high' })}>
 *         {flowState === 'creating' ? 'Creating...' : 'Create Task'}
 *       </button>
 *       {flowState === 'success' && <span>Created successfully!</span>}
 *       {flowState === 'error' && <span>Error: {flowContext.error}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCreateTaskWithFlow(): FlowAwareMutationResult<Task, Error, CreateTaskInput> {
  const apiService = usePort(TaskApiServicePort);
  const cacheService = usePort(TaskCacheServicePort);
  const queryClient = useQueryClient();
  const { state, context, send } = useMachine(TaskFlowServicePort);

  const mutation = useMutation<Task, Error, CreateTaskInput>({
    mutationFn: input => apiService.createTask(input),

    onMutate: async input => {
      // Transition flow to creating state
      send({ type: "CREATE" });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

      // Optimistically add the new task
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: "todo",
        dueDate: input.dueDate ?? null,
        projectId: input.projectId,
        assigneeId: input.assigneeId ?? null,
        labels: input.labels ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      cacheService.setOptimisticTask(optimisticTask);
    },

    onSuccess: async () => {
      // Transition flow to success state
      send({ type: "SUCCESS" });

      // Invalidate cache
      await cacheService.invalidateTasks();
      await cacheService.invalidateStats();
    },

    onError: () => {
      // Transition flow to error state
      send({ type: "ERROR" });

      // Rollback optimistic update
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending || state === "creating",
    error: mutation.error,
    data: mutation.data,
    flowState: state,
    flowContext: context,
    resetFlow: () => send({ type: "RESET" }),
  };
}

/**
 * Hook for updating a task with flow machine integration.
 *
 * @example
 * ```tsx
 * function UpdateTaskButton({ task }: { task: Task }) {
 *   const { mutate, flowState, flowContext } = useUpdateTaskWithFlow();
 *
 *   return (
 *     <button
 *       onClick={() => mutate({ id: task.id, status: 'done' })}
 *       disabled={flowState === 'updating' && flowContext.currentTaskId === task.id}
 *     >
 *       {flowState === 'updating' && flowContext.currentTaskId === task.id
 *         ? 'Updating...'
 *         : 'Mark Done'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useUpdateTaskWithFlow(): FlowAwareMutationResult<Task, Error, UpdateTaskInput> {
  const apiService = usePort(TaskApiServicePort);
  const cacheService = usePort(TaskCacheServicePort);
  const queryClient = useQueryClient();
  const { state, context, send } = useMachine(TaskFlowServicePort);

  interface UpdateMutationContext {
    previousTask?: Task | null;
  }

  const mutation = useMutation<Task, Error, UpdateTaskInput, UpdateMutationContext>({
    mutationFn: input => apiService.updateTask(input),

    onMutate: async input => {
      // Transition flow to updating state with task ID
      send({ type: "UPDATE", payload: { id: input.id } } as { readonly type: "UPDATE" });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(input.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

      // Get previous task for optimistic update
      const previousTask = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(input.id));

      if (previousTask) {
        const optimisticTask: Task = {
          ...previousTask,
          title: input.title ?? previousTask.title,
          description:
            input.description !== undefined ? input.description : previousTask.description,
          status: input.status ?? previousTask.status,
          priority: input.priority ?? previousTask.priority,
          assigneeId: input.assigneeId !== undefined ? input.assigneeId : previousTask.assigneeId,
          dueDate: input.dueDate !== undefined ? input.dueDate : previousTask.dueDate,
          labels: input.labels ?? previousTask.labels,
          updatedAt: new Date(),
        };

        cacheService.setOptimisticTask(optimisticTask);
      }

      return { previousTask };
    },

    onSuccess: async () => {
      send({ type: "SUCCESS" });
      await cacheService.invalidateTasks();
      await cacheService.invalidateStats();
    },

    onError: (_error, _input, mutationContext) => {
      send({ type: "ERROR" });

      // Rollback optimistic update
      if (mutationContext?.previousTask) {
        cacheService.setOptimisticTask(mutationContext.previousTask);
      }
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending || state === "updating",
    error: mutation.error,
    data: mutation.data,
    flowState: state,
    flowContext: context,
    resetFlow: () => send({ type: "RESET" }),
  };
}

/**
 * Hook for deleting a task with flow machine integration.
 *
 * @example
 * ```tsx
 * function DeleteTaskButton({ task }: { task: Task }) {
 *   const { mutate, flowState, flowContext } = useDeleteTaskWithFlow();
 *
 *   return (
 *     <button
 *       onClick={() => mutate(task.id)}
 *       disabled={flowState === 'deleting'}
 *     >
 *       {flowState === 'deleting' && flowContext.currentTaskId === task.id
 *         ? 'Deleting...'
 *         : 'Delete'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteTaskWithFlow(): FlowAwareMutationResult<void, Error, string> {
  const apiService = usePort(TaskApiServicePort);
  const cacheService = usePort(TaskCacheServicePort);
  const queryClient = useQueryClient();
  const { state, context, send } = useMachine(TaskFlowServicePort);

  interface DeleteMutationContext {
    previousTask?: Task | null;
  }

  const mutation = useMutation<void, Error, string, DeleteMutationContext>({
    mutationFn: id => apiService.deleteTask(id),

    onMutate: async id => {
      // Transition flow to deleting state with task ID
      send({ type: "DELETE", payload: { id } } as { readonly type: "DELETE" });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });

      // Get previous task for rollback
      const previousTask = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(id));

      // Optimistically remove the task
      cacheService.removeOptimisticTask(id);

      return { previousTask };
    },

    onSuccess: async () => {
      send({ type: "SUCCESS" });
      await cacheService.invalidateTasks();
      await cacheService.invalidateStats();
    },

    onError: (_error, _id, mutationContext) => {
      send({ type: "ERROR" });

      // Rollback optimistic update
      if (mutationContext?.previousTask) {
        cacheService.setOptimisticTask(mutationContext.previousTask);
      }
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending || state === "deleting",
    error: mutation.error,
    data: mutation.data,
    flowState: state,
    flowContext: context,
    resetFlow: () => send({ type: "RESET" }),
  };
}

/**
 * Hook for toggling task completion with flow machine integration.
 *
 * @example
 * ```tsx
 * function TaskCheckbox({ task }: { task: Task }) {
 *   const { mutate, flowState, flowContext } = useToggleTaskCompleteWithFlow();
 *
 *   return (
 *     <input
 *       type="checkbox"
 *       checked={task.status === 'done'}
 *       onChange={() => mutate(task.id)}
 *       disabled={flowState === 'updating' && flowContext.currentTaskId === task.id}
 *     />
 *   );
 * }
 * ```
 */
export function useToggleTaskCompleteWithFlow(): FlowAwareMutationResult<Task, Error, string> {
  const apiService = usePort(TaskApiServicePort);
  const cacheService = usePort(TaskCacheServicePort);
  const queryClient = useQueryClient();
  const { state, context, send } = useMachine(TaskFlowServicePort);

  interface ToggleMutationContext {
    previousTask?: Task | null;
  }

  const mutation = useMutation<Task, Error, string, ToggleMutationContext>({
    mutationFn: id => apiService.toggleTaskComplete(id),

    onMutate: async id => {
      // Transition flow to updating state (toggle is a type of update)
      send({ type: "TOGGLE_COMPLETE", payload: { id } } as { readonly type: "TOGGLE_COMPLETE" });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

      // Get previous task for optimistic update
      const previousTask = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(id));

      if (previousTask) {
        const newStatus = previousTask.status === "done" ? "todo" : "done";
        const optimisticTask: Task = {
          ...previousTask,
          status: newStatus,
          updatedAt: new Date(),
        };

        cacheService.setOptimisticTask(optimisticTask);
      }

      return { previousTask };
    },

    onSuccess: async () => {
      send({ type: "SUCCESS" });
      await cacheService.invalidateTasks();
      await cacheService.invalidateStats();
    },

    onError: (_error, _id, mutationContext) => {
      send({ type: "ERROR" });

      // Rollback optimistic update
      if (mutationContext?.previousTask) {
        cacheService.setOptimisticTask(mutationContext.previousTask);
      }
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending || state === "updating",
    error: mutation.error,
    data: mutation.data,
    flowState: state,
    flowContext: context,
    resetFlow: () => send({ type: "RESET" }),
  };
}

// =============================================================================
// Flow State Hook
// =============================================================================

/**
 * Hook to access the current task flow state and context.
 *
 * This is useful for components that need to show flow state
 * without performing mutations themselves.
 *
 * @example
 * ```tsx
 * function TaskFlowIndicator() {
 *   const { state, context, dismiss } = useTaskFlowState();
 *
 *   if (state === 'idle') return null;
 *
 *   return (
 *     <div className={`alert alert-${state === 'error' ? 'error' : 'info'}`}>
 *       {state === 'creating' && 'Creating task...'}
 *       {state === 'updating' && 'Updating task...'}
 *       {state === 'deleting' && 'Deleting task...'}
 *       {state === 'success' && 'Operation completed!'}
 *       {state === 'error' && `Error: ${context.error}`}
 *       {(state === 'success' || state === 'error') && (
 *         <button onClick={dismiss}>Dismiss</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTaskFlowState() {
  const { state, context, send } = useMachine(TaskFlowServicePort);

  return {
    /** The current flow state */
    state,
    /** The flow context */
    context,
    /** Dismiss error or success state */
    dismiss: () => send({ type: "DISMISS" }),
    /** Reset flow to idle */
    reset: () => send({ type: "RESET" }),
    /** Whether any operation is in progress */
    isOperating: state === "creating" || state === "updating" || state === "deleting",
    /** Whether the flow is in success state */
    isSuccess: state === "success",
    /** Whether the flow is in error state */
    isError: state === "error",
  };
}
