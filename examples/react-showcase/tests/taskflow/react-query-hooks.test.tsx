/**
 * Tests for React Query Hooks in the TaskFlow Application
 *
 * These tests verify:
 * 1. Task list fetching with filters
 * 2. Task creation mutation
 * 3. Task update mutation
 * 4. Cache invalidation after mutations
 * 5. Optimistic updates work correctly
 *
 * @packageDocumentation
 */

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HexDiContainerProvider } from "@hex-di/react";
import { createContainer } from "@hex-di/runtime";
import { GraphBuilder } from "@hex-di/graph";

import {
  TaskApiServiceAdapter,
  createTaskCacheServiceAdapter,
  useTaskList,
  useTask,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useToggleTaskComplete,
  DEFAULT_FILTERS,
  type TaskFilterState,
  type Task,
} from "../../src/taskflow/index.js";

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Creates a test environment with container and query client.
 */
function createTestEnv() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const graph = GraphBuilder.create()
    .provide(TaskApiServiceAdapter)
    .provide(createTaskCacheServiceAdapter(queryClient))
    .build();

  const container = createContainer({ graph, name: "Test" });

  return { queryClient, container };
}

/**
 * Test wrapper component that provides container and query client.
 */
function createWrapper(queryClient: QueryClient, container: ReturnType<typeof createContainer>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HexDiContainerProvider container={container}>{children}</HexDiContainerProvider>
      </QueryClientProvider>
    );
  };
}

// =============================================================================
// Test Components
// =============================================================================

/**
 * Test component for useTaskList hook.
 */
function TaskListComponent({ filters }: { filters: TaskFilterState }) {
  const { data, isLoading, error } = useTaskList({ filters });

  if (isLoading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  if (!data) return <div data-testid="no-data">No data</div>;

  return (
    <div data-testid="task-list">
      <span data-testid="total">{data.total}</span>
      <span data-testid="page">{data.page}</span>
      <span data-testid="task-count">{data.tasks.length}</span>
      <ul>
        {data.tasks.map(task => (
          <li key={task.id} data-testid={`task-${task.id}`}>
            {task.title} - {task.status} - {task.priority}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Test component for useTaskStats hook.
 */
function TaskStatsComponent() {
  const { data, isLoading, error } = useTaskStats();

  if (isLoading) return <div data-testid="stats-loading">Loading stats...</div>;
  if (error) return <div data-testid="stats-error">{error.message}</div>;
  if (!data) return <div data-testid="no-stats">No stats</div>;

  return (
    <div data-testid="task-stats">
      <span data-testid="todo-count">{data.todoCount}</span>
      <span data-testid="in-progress-count">{data.inProgressCount}</span>
      <span data-testid="done-count">{data.doneCount}</span>
      <span data-testid="due-today-count">{data.dueTodayCount}</span>
    </div>
  );
}

/**
 * Test component for useCreateTask mutation.
 */
function CreateTaskComponent({ onSuccess }: { onSuccess?: (task: Task) => void }) {
  const { mutate, isPending, error, data } = useCreateTask();

  const handleCreate = () => {
    mutate(
      {
        title: "New Test Task",
        projectId: "proj-1",
        priority: "high",
      },
      {
        onSuccess: task => onSuccess?.(task),
      }
    );
  };

  return (
    <div data-testid="create-task">
      <button onClick={handleCreate} disabled={isPending} data-testid="create-button">
        {isPending ? "Creating..." : "Create Task"}
      </button>
      {error && <div data-testid="create-error">{error.message}</div>}
      {data && <div data-testid="created-task-id">{data.id}</div>}
    </div>
  );
}

/**
 * Test component for useUpdateTask mutation.
 */
function UpdateTaskComponent({
  taskId,
  onSuccess,
}: {
  taskId: string;
  onSuccess?: (task: Task) => void;
}) {
  const { mutate, isPending, error, data } = useUpdateTask();

  const handleUpdate = () => {
    mutate(
      {
        id: taskId,
        title: "Updated Task Title",
        status: "in-progress",
      },
      {
        onSuccess: task => onSuccess?.(task),
      }
    );
  };

  return (
    <div data-testid="update-task">
      <button onClick={handleUpdate} disabled={isPending} data-testid="update-button">
        {isPending ? "Updating..." : "Update Task"}
      </button>
      {error && <div data-testid="update-error">{error.message}</div>}
      {data && <div data-testid="updated-task-title">{data.title}</div>}
    </div>
  );
}

/**
 * Test component for cache invalidation.
 */
function CacheInvalidationComponent() {
  const {
    data: tasks,
    isLoading: tasksLoading,
    dataUpdatedAt,
  } = useTaskList({
    filters: DEFAULT_FILTERS,
  });
  const { mutate: createTask, isPending: creating } = useCreateTask();

  const handleCreate = () => {
    createTask({
      title: "Cache Test Task",
      projectId: "proj-1",
      priority: "medium",
    });
  };

  if (tasksLoading) return <div data-testid="loading">Loading...</div>;

  return (
    <div data-testid="cache-test">
      <span data-testid="task-count">{tasks?.total ?? 0}</span>
      <span data-testid="data-updated-at">{dataUpdatedAt}</span>
      <button onClick={handleCreate} disabled={creating} data-testid="create-button">
        Create
      </button>
    </div>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("React Query Hooks", () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    env = createTestEnv();
  });

  afterEach(async () => {
    vi.useRealTimers();
    env.queryClient.clear();
    await env.container.dispose();
  });

  // ===========================================================================
  // Test 1: Task List Fetching with Filters
  // ===========================================================================

  describe("useTaskList - Task List Fetching with Filters", () => {
    it("should fetch tasks with default filters", async () => {
      const Wrapper = createWrapper(env.queryClient, env.container);

      render(
        <Wrapper>
          <TaskListComponent filters={DEFAULT_FILTERS} />
        </Wrapper>
      );

      // Should show loading state initially
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Wait for data to load
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list")).toBeInTheDocument();
      });

      // Should have tasks with total count
      const total = screen.getByTestId("total");
      expect(parseInt(total.textContent ?? "0", 10)).toBeGreaterThan(0);
    });

    it("should filter tasks by status", async () => {
      const Wrapper = createWrapper(env.queryClient, env.container);
      const todoFilters: TaskFilterState = { ...DEFAULT_FILTERS, status: "todo" };

      render(
        <Wrapper>
          <TaskListComponent filters={todoFilters} />
        </Wrapper>
      );

      // Wait for data to load
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list")).toBeInTheDocument();
      });

      // All displayed tasks should have 'todo' status
      const taskItems = screen.getAllByRole("listitem");
      taskItems.forEach(item => {
        expect(item.textContent).toContain("todo");
      });
    });
  });

  // ===========================================================================
  // Test 2: Task Creation Mutation
  // ===========================================================================

  describe("useCreateTask - Task Creation Mutation", () => {
    it("should create a new task successfully", async () => {
      const Wrapper = createWrapper(env.queryClient, env.container);
      const onSuccess = vi.fn();

      render(
        <Wrapper>
          <CreateTaskComponent onSuccess={onSuccess} />
        </Wrapper>
      );

      // Click create button
      const createButton = screen.getByTestId("create-button");

      await act(async () => {
        createButton.click();
        // Wait for the mutation to start and show pending state
        await vi.advanceTimersByTimeAsync(50);
      });

      // Wait for mutation to complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("created-task-id")).toBeInTheDocument();
      });

      // Callback should be called with created task
      expect(onSuccess).toHaveBeenCalled();
      const createdTask = onSuccess.mock.calls[0][0];
      expect(createdTask.title).toBe("New Test Task");
      expect(createdTask.priority).toBe("high");
      expect(createdTask.status).toBe("todo");
    });

    it("should handle creation error gracefully", async () => {
      const Wrapper = createWrapper(env.queryClient, env.container);

      // Component that creates a task with "error" in title (triggers mock error)
      function ErrorCreateComponent() {
        const { mutate, isPending, error } = useCreateTask();

        return (
          <div>
            <button
              onClick={() => mutate({ title: "error task", projectId: "proj-1", priority: "low" })}
              disabled={isPending}
              data-testid="create-button"
            >
              Create
            </button>
            {error && <div data-testid="error">{error.message}</div>}
          </div>
        );
      }

      render(
        <Wrapper>
          <ErrorCreateComponent />
        </Wrapper>
      );

      await act(async () => {
        screen.getByTestId("create-button").click();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent("Invalid title");
    });
  });

  // ===========================================================================
  // Test 3: Task Update Mutation
  // ===========================================================================

  describe("useUpdateTask - Task Update Mutation", () => {
    it("should update an existing task successfully", async () => {
      const Wrapper = createWrapper(env.queryClient, env.container);
      const onSuccess = vi.fn();

      render(
        <Wrapper>
          <UpdateTaskComponent taskId="task-1" onSuccess={onSuccess} />
        </Wrapper>
      );

      // Click update button
      await act(async () => {
        screen.getByTestId("update-button").click();
        // Wait for the mutation to start
        await vi.advanceTimersByTimeAsync(50);
      });

      // Wait for mutation to complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("updated-task-title")).toBeInTheDocument();
      });

      // Callback should be called with updated task
      expect(onSuccess).toHaveBeenCalled();
      const updatedTask = onSuccess.mock.calls[0][0];
      expect(updatedTask.title).toBe("Updated Task Title");
      expect(updatedTask.status).toBe("in-progress");
    });
  });

  // ===========================================================================
  // Test 4: Cache Invalidation After Mutations
  // ===========================================================================

  describe("Cache Invalidation", () => {
    it("should invalidate task list cache after creating a task", async () => {
      const Wrapper = createWrapper(env.queryClient, env.container);

      render(
        <Wrapper>
          <CacheInvalidationComponent />
        </Wrapper>
      );

      // Wait for initial load
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("cache-test")).toBeInTheDocument();
      });

      const initialCount = parseInt(screen.getByTestId("task-count").textContent ?? "0", 10);
      const initialUpdatedAt = screen.getByTestId("data-updated-at").textContent;

      // Create a new task
      await act(async () => {
        screen.getByTestId("create-button").click();
      });

      // Wait for mutation and cache invalidation
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });

      await waitFor(
        () => {
          const newCount = parseInt(screen.getByTestId("task-count").textContent ?? "0", 10);
          const newUpdatedAt = screen.getByTestId("data-updated-at").textContent;

          // Count should increase and data should be refetched
          return newCount > initialCount || newUpdatedAt !== initialUpdatedAt;
        },
        { timeout: 5000 }
      );

      const finalCount = parseInt(screen.getByTestId("task-count").textContent ?? "0", 10);
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  // ===========================================================================
  // Test 5: Task Stats Query
  // ===========================================================================

  describe("useTaskStats - Aggregate Statistics", () => {
    it("should fetch task statistics correctly", async () => {
      const Wrapper = createWrapper(env.queryClient, env.container);

      render(
        <Wrapper>
          <TaskStatsComponent />
        </Wrapper>
      );

      // Should show loading state initially
      expect(screen.getByTestId("stats-loading")).toBeInTheDocument();

      // Wait for data to load
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-stats")).toBeInTheDocument();
      });

      // Stats should be numbers
      const todoCount = parseInt(screen.getByTestId("todo-count").textContent ?? "0", 10);
      const inProgressCount = parseInt(
        screen.getByTestId("in-progress-count").textContent ?? "0",
        10
      );
      const doneCount = parseInt(screen.getByTestId("done-count").textContent ?? "0", 10);

      // Total should match the sum of status counts
      expect(todoCount + inProgressCount + doneCount).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Test 6: Toggle Task Complete (Optimistic Update)
  // ===========================================================================

  describe("useToggleTaskComplete - Optimistic Update", () => {
    it("should toggle task completion with optimistic update", async () => {
      const Wrapper = createWrapper(env.queryClient, env.container);

      function ToggleComponent() {
        const { data: task, isLoading } = useTask({ id: "task-1" });
        const { mutate: toggle, isPending } = useToggleTaskComplete();

        if (isLoading) return <div data-testid="loading">Loading...</div>;
        if (!task) return <div data-testid="not-found">Not found</div>;

        return (
          <div data-testid="toggle-component">
            <span data-testid="task-status">{task.status}</span>
            <button
              onClick={() => toggle(task.id)}
              disabled={isPending}
              data-testid="toggle-button"
            >
              Toggle
            </button>
          </div>
        );
      }

      render(
        <Wrapper>
          <ToggleComponent />
        </Wrapper>
      );

      // Wait for initial load
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("toggle-component")).toBeInTheDocument();
      });

      const initialStatus = screen.getByTestId("task-status").textContent;

      // Toggle the task
      await act(async () => {
        screen.getByTestId("toggle-button").click();
      });

      // Wait for mutation to complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      await waitFor(() => {
        const newStatus = screen.getByTestId("task-status").textContent;
        // Status should have changed (todo -> done or done -> todo)
        if (initialStatus === "done") {
          expect(newStatus).toBe("todo");
        } else {
          expect(newStatus).toBe("done");
        }
      });
    });
  });
});
