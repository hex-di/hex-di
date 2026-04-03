/**
 * TanStack Query mutation hooks for TaskFlow with optimistic updates.
 *
 * @packageDocumentation
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePort } from "@hex-di/react";
import { queryKeys } from "../query-client.js";
import {
  TaskApiServicePort,
  TaskCacheServicePort,
  type CreateTaskInput,
  type UpdateTaskInput,
  type PaginatedTaskResult,
} from "./ports.js";
import type { Task } from "../types.js";

/**
 * Context type for optimistic update rollback.
 */
interface MutationContext {
  previousTasks?: PaginatedTaskResult;
  previousTask?: Task | null;
}

/**
 * Hook for creating a new task with optimistic update.
 *
 * @returns Mutation result with create function
 *
 * @example
 * ```tsx
 * function CreateTaskForm() {
 *   const { mutate: createTask, isPending } = useCreateTask();
 *
 *   const handleSubmit = (data: CreateTaskInput) => {
 *     createTask(data, {
 *       onSuccess: (task) => console.log('Created:', task.id),
 *       onError: (err) => console.error('Failed:', err.message),
 *     });
 *   };
 *
 *   return <TaskForm onSubmit={handleSubmit} isSubmitting={isPending} />;
 * }
 * ```
 */
export function useCreateTask() {
  const apiService = usePort(TaskApiServicePort);
  const cacheService = usePort(TaskCacheServicePort);
  const queryClient = useQueryClient();

  return useMutation<Task, Error, CreateTaskInput, MutationContext>({
    mutationFn: input => apiService.createTask(input),

    onMutate: async input => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<PaginatedTaskResult>(queryKeys.tasks.lists());

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

      return { previousTasks };
    },

    onError: (_err, _input, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        cacheService.rollbackTask({ previousTasks: context.previousTasks.tasks });
      }
    },

    onSettled: async () => {
      // Always refetch after error or success
      await cacheService.invalidateTasks();
      await cacheService.invalidateStats();
    },
  });
}

/**
 * Hook for updating an existing task with optimistic update.
 *
 * @returns Mutation result with update function
 *
 * @example
 * ```tsx
 * function TaskEditor({ task }: { task: Task }) {
 *   const { mutate: updateTask, isPending } = useUpdateTask();
 *
 *   const handleSave = (updates: Partial<Task>) => {
 *     updateTask({ id: task.id, ...updates });
 *   };
 *
 *   return <TaskEditForm task={task} onSave={handleSave} isSaving={isPending} />;
 * }
 * ```
 */
export function useUpdateTask() {
  const apiService = usePort(TaskApiServicePort);
  const cacheService = usePort(TaskCacheServicePort);
  const queryClient = useQueryClient();

  return useMutation<Task, Error, UpdateTaskInput, MutationContext>({
    mutationFn: input => apiService.updateTask(input),

    onMutate: async input => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(input.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

      // Snapshot the previous value
      const previousTask = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(input.id));

      // Optimistically update the task
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

    onError: (_err, input, context) => {
      // Rollback on error
      if (context?.previousTask) {
        cacheService.setOptimisticTask(context.previousTask);
      } else {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(input.id) });
      }
    },

    onSettled: async (_data, _err, input) => {
      // Always refetch after error or success
      await cacheService.invalidateTask(input.id);
      await cacheService.invalidateTasks();
      await cacheService.invalidateStats();
    },
  });
}

/**
 * Hook for deleting a task with optimistic update.
 *
 * @returns Mutation result with delete function
 *
 * @example
 * ```tsx
 * function TaskActions({ task }: { task: Task }) {
 *   const { mutate: deleteTask, isPending } = useDeleteTask();
 *
 *   const handleDelete = () => {
 *     if (confirm('Are you sure?')) {
 *       deleteTask(task.id);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleDelete} disabled={isPending}>
 *       {isPending ? 'Deleting...' : 'Delete'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteTask() {
  const apiService = usePort(TaskApiServicePort);
  const cacheService = usePort(TaskCacheServicePort);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, MutationContext>({
    mutationFn: id => apiService.deleteTask(id),

    onMutate: async id => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });

      // Snapshot the previous values
      const previousTask = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(id));

      // Optimistically remove the task
      cacheService.removeOptimisticTask(id);

      return { previousTask };
    },

    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousTask) {
        cacheService.setOptimisticTask(context.previousTask);
      }
    },

    onSettled: async () => {
      // Always refetch after error or success
      await cacheService.invalidateTasks();
      await cacheService.invalidateStats();
    },
  });
}

/**
 * Hook for toggling task completion status with optimistic update.
 *
 * @returns Mutation result with toggle function
 *
 * @example
 * ```tsx
 * function TaskCheckbox({ task }: { task: Task }) {
 *   const { mutate: toggleComplete, isPending } = useToggleTaskComplete();
 *
 *   return (
 *     <input
 *       type="checkbox"
 *       checked={task.status === 'done'}
 *       onChange={() => toggleComplete(task.id)}
 *       disabled={isPending}
 *     />
 *   );
 * }
 * ```
 */
export function useToggleTaskComplete() {
  const apiService = usePort(TaskApiServicePort);
  const cacheService = usePort(TaskCacheServicePort);
  const queryClient = useQueryClient();

  return useMutation<Task, Error, string, MutationContext>({
    mutationFn: id => apiService.toggleTaskComplete(id),

    onMutate: async id => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

      // Snapshot the previous value
      const previousTask = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(id));

      // Optimistically toggle the task
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

    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousTask) {
        cacheService.setOptimisticTask(context.previousTask);
      }
    },

    onSettled: async (_data, _err, id) => {
      // Always refetch after error or success
      await cacheService.invalidateTask(id);
      await cacheService.invalidateTasks();
      await cacheService.invalidateStats();
    },
  });
}
