/**
 * Adapter Definitions for TaskFlow Data Layer
 *
 * Implements HexDI adapters for:
 * - TaskApiService: Mock API with realistic delays
 * - TaskCacheService: React Query cache coordination
 * - TaskFlowService: State machine for CRUD workflows
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import {
  createMachineRunner,
  createActivityManager,
  createDIEffectExecutor,
  type FlowService,
} from "@hex-di/flow";
import { QueryClient } from "@tanstack/react-query";
import {
  TaskApiServicePort,
  TaskCacheServicePort,
  TaskFlowServicePort,
  type TaskApiService,
  type TaskCacheService,
  type TaskFlowService,
  type CreateTaskInput,
  type UpdateTaskInput,
  type PaginatedTaskResult,
  type TaskFlowContext,
  type TaskFlowState,
  type TaskFlowEvent,
} from "./ports.js";
import { taskFlowMachine } from "./machine.js";
import { simulateNetworkDelay, generateMockDataSet, type MockDataSet } from "./mock-data.js";
import { queryKeys } from "../query-client.js";
import type { Task, TaskStats, TaskFilterState } from "../types.js";

// =============================================================================
// Mock Data Store
// =============================================================================

/**
 * Mutable mock data store for the API service.
 * This allows mutations to persist during the session.
 */
interface MockDataStore {
  data: MockDataSet;
}

function createMockDataStore(): MockDataStore {
  return {
    data: generateMockDataSet({
      userCount: 8,
      projectCount: 6,
      taskCount: 50,
    }),
  };
}

// =============================================================================
// Task API Service Adapter
// =============================================================================

/**
 * Creates a mock task API service.
 *
 * @param store - The mock data store to use
 */
function createTaskApiService(store: MockDataStore): TaskApiService {
  const getTasks = (tasks: readonly Task[]) => [...tasks];
  const setTasks = (tasks: readonly Task[]) => {
    store.data = { ...store.data, tasks };
  };

  return {
    async getTasks(filters: TaskFilterState): Promise<PaginatedTaskResult> {
      await simulateNetworkDelay();

      let filteredTasks = getTasks(store.data.tasks);

      // Apply status filter
      if (filters.status !== "all") {
        filteredTasks = filteredTasks.filter(t => t.status === filters.status);
      }

      // Apply priority filter
      if (filters.priority !== "all") {
        filteredTasks = filteredTasks.filter(t => t.priority === filters.priority);
      }

      // Apply project filter
      if (filters.projectId !== "all") {
        filteredTasks = filteredTasks.filter(t => t.projectId === filters.projectId);
      }

      // Sort by createdAt descending (newest first)
      filteredTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = filteredTasks.length;
      const totalPages = Math.ceil(total / filters.pageSize);
      const startIndex = (filters.page - 1) * filters.pageSize;
      const endIndex = startIndex + filters.pageSize;
      const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

      return {
        tasks: paginatedTasks,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages,
      };
    },

    async getTask(id: string): Promise<Task | null> {
      await simulateNetworkDelay();
      return store.data.tasks.find(t => t.id === id) ?? null;
    },

    async getTaskStats(): Promise<TaskStats> {
      await simulateNetworkDelay();

      const tasks = store.data.tasks;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        todoCount: tasks.filter(t => t.status === "todo").length,
        inProgressCount: tasks.filter(t => t.status === "in-progress").length,
        doneCount: tasks.filter(t => t.status === "done").length,
        dueTodayCount: tasks.filter(t => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          return due.getTime() === today.getTime();
        }).length,
      };
    },

    async createTask(input: CreateTaskInput): Promise<Task> {
      await simulateNetworkDelay();

      // Simulate validation error for specific titles
      if (input.title.toLowerCase().includes("error")) {
        throw new Error("Failed to create task: Invalid title");
      }

      const now = new Date();
      const tasks = getTasks(store.data.tasks);
      const maxId = tasks.reduce((max, t) => {
        const num = parseInt(t.id.replace("task-", ""), 10);
        return Math.max(max, isNaN(num) ? 0 : num);
      }, 0);

      const newTask: Task = {
        id: `task-${maxId + 1}`,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: "todo",
        dueDate: input.dueDate ?? null,
        projectId: input.projectId,
        assigneeId: input.assigneeId ?? null,
        labels: input.labels ?? [],
        createdAt: now,
        updatedAt: now,
      };

      setTasks([...tasks, newTask]);
      return newTask;
    },

    async updateTask(input: UpdateTaskInput): Promise<Task> {
      await simulateNetworkDelay();

      const tasks = getTasks(store.data.tasks);
      const index = tasks.findIndex(t => t.id === input.id);

      if (index === -1) {
        throw new Error(`Task not found: ${input.id}`);
      }

      const existing = tasks[index];
      const updated: Task = {
        ...existing,
        title: input.title ?? existing.title,
        description: input.description !== undefined ? input.description : existing.description,
        status: input.status ?? existing.status,
        priority: input.priority ?? existing.priority,
        assigneeId: input.assigneeId !== undefined ? input.assigneeId : existing.assigneeId,
        dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
        labels: input.labels ?? existing.labels,
        updatedAt: new Date(),
      };

      const newTasks = [...tasks];
      newTasks[index] = updated;
      setTasks(newTasks);

      return updated;
    },

    async deleteTask(id: string): Promise<void> {
      await simulateNetworkDelay();

      const tasks = getTasks(store.data.tasks);
      const index = tasks.findIndex(t => t.id === id);

      if (index === -1) {
        throw new Error(`Task not found: ${id}`);
      }

      setTasks(tasks.filter(t => t.id !== id));
    },

    async toggleTaskComplete(id: string): Promise<Task> {
      await simulateNetworkDelay();

      const tasks = getTasks(store.data.tasks);
      const index = tasks.findIndex(t => t.id === id);

      if (index === -1) {
        throw new Error(`Task not found: ${id}`);
      }

      const existing = tasks[index];
      const newStatus = existing.status === "done" ? "todo" : "done";

      const updated: Task = {
        ...existing,
        status: newStatus,
        updatedAt: new Date(),
      };

      const newTasks = [...tasks];
      newTasks[index] = updated;
      setTasks(newTasks);

      return updated;
    },

    async getProjects() {
      await simulateNetworkDelay();
      return store.data.projects;
    },

    async getUsers() {
      await simulateNetworkDelay();
      return store.data.users;
    },
  };
}

/**
 * Adapter for the TaskApiService.
 *
 * Creates a singleton mock API service with realistic delays.
 */
export const TaskApiServiceAdapter = createAdapter({
  provides: TaskApiServicePort,
  requires: [] as const,
  lifetime: "singleton",
  factory: (): TaskApiService => {
    const store = createMockDataStore();
    return createTaskApiService(store);
  },
});

// =============================================================================
// Cache Service Adapter
// =============================================================================

/**
 * Creates a cache service wrapping a QueryClient.
 *
 * @param queryClient - The React Query client to wrap
 */
function createTaskCacheService(queryClient: QueryClient): TaskCacheService {
  return {
    async invalidateTasks(): Promise<void> {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },

    async invalidateTask(id: string): Promise<void> {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
    },

    async invalidateStats(): Promise<void> {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.stats() });
    },

    setOptimisticTask(task: Task): void {
      // Update the task in any list queries
      queryClient.setQueriesData<PaginatedTaskResult>(
        { queryKey: queryKeys.tasks.lists() },
        old => {
          if (!old) return old;
          const exists = old.tasks.some(t => t.id === task.id);
          if (exists) {
            return {
              ...old,
              tasks: old.tasks.map(t => (t.id === task.id ? task : t)),
            };
          }
          return {
            ...old,
            tasks: [task, ...old.tasks],
            total: old.total + 1,
          };
        }
      );

      // Update the individual task query
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
    },

    removeOptimisticTask(id: string): void {
      queryClient.setQueriesData<PaginatedTaskResult>(
        { queryKey: queryKeys.tasks.lists() },
        old => {
          if (!old) return old;
          return {
            ...old,
            tasks: old.tasks.filter(t => t.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(id) });
    },

    rollbackTask(context): void {
      if (context.previousTasks) {
        // Rollback list queries - this is simplified, real implementation
        // would need to restore the exact previous state
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      }
      if (context.previousTask !== undefined) {
        const id = context.previousTask?.id;
        if (id) {
          queryClient.setQueryData(queryKeys.tasks.detail(id), context.previousTask);
        }
      }
    },

    getQueryClient(): QueryClient {
      return queryClient;
    },
  };
}

/**
 * Creates the TaskCacheService adapter.
 *
 * Note: The QueryClient must be created separately and passed to this factory.
 * This allows sharing the QueryClient with React Query's QueryClientProvider.
 *
 * @param queryClient - The QueryClient to wrap
 */
export function createTaskCacheServiceAdapter(queryClient: QueryClient) {
  return createAdapter({
    provides: TaskCacheServicePort,
    requires: [] as const,
    lifetime: "singleton",
    factory: (): TaskCacheService => createTaskCacheService(queryClient),
  });
}

// =============================================================================
// Task Flow Service Adapter
// =============================================================================

/**
 * Adapter for the Task FlowService.
 *
 * Creates a FlowService that coordinates with React Query cache.
 */
export const TaskFlowServiceAdapter = createAdapter({
  provides: TaskFlowServicePort,
  requires: [TaskApiServicePort, TaskCacheServicePort],
  lifetime: "scoped",
  factory: (deps): TaskFlowService => {
    // Store deps for potential future use
    void deps;

    const activityManager = createActivityManager();

    // Create executor - this example uses Effect.delay() only
    const executor = createDIEffectExecutor({
      scope: {
        resolve: () => {
          throw new Error("This example does not use Effect.invoke()");
        },
      },
      activityManager,
    });

    const runner = createMachineRunner(taskFlowMachine, {
      executor,
      activityManager,
    });

    // Create FlowService wrapper with specific types
    const flowService: FlowService<TaskFlowState, TaskFlowEvent, TaskFlowContext> = {
      snapshot() {
        return runner.snapshot();
      },
      state() {
        return runner.state();
      },
      context() {
        return runner.context();
      },
      send(event) {
        return runner.send(event);
      },
      sendBatch(events) {
        return runner.sendBatch(events);
      },
      sendAndExecute(event) {
        return runner.sendAndExecute(event);
      },
      subscribe(callback) {
        return runner.subscribe(callback);
      },
      getActivityStatus(id) {
        return runner.getActivityStatus(id);
      },
      dispose() {
        return runner.dispose();
      },
      get isDisposed() {
        return runner.isDisposed;
      },
    };

    return flowService;
  },
});
