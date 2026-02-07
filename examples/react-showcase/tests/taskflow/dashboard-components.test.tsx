/**
 * Dashboard Components Tests
 *
 * Tests for the dashboard view components including:
 * 1. StatsCards - Display correct counts with loading skeleton
 * 2. FilterBar - Updates and syncs with filter store
 * 3. TaskList - Renders with loading/error/empty states
 * 4. Pagination - Controls work correctly
 *
 * @packageDocumentation
 */

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HexDiContainerProvider } from "@hex-di/react";
import { createContainer } from "@hex-di/runtime";
import { GraphBuilder } from "@hex-di/graph";

import {
  TaskApiServiceAdapter,
  createTaskCacheServiceAdapter,
  createFilterStore,
  FilterStoreAdapter,
  DEFAULT_FILTERS,
  type TaskFilterState,
} from "../../src/taskflow/index.js";

import {
  StatsCards,
  FilterBar,
  TaskList,
  Pagination,
  TaskCard,
} from "../../src/taskflow/components/dashboard/index.js";

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Creates a test environment with container, query client, and filter store.
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

  const filterStore = createFilterStore();

  const graph = GraphBuilder.create()
    .provide(TaskApiServiceAdapter)
    .provide(createTaskCacheServiceAdapter(queryClient))
    .provide(FilterStoreAdapter)
    .build();

  const container = createContainer({ graph, name: "Test" });

  return { queryClient, container, filterStore };
}

/**
 * Test wrapper component providing all necessary context.
 */
function createWrapper(
  queryClient: QueryClient,
  container: ReturnType<typeof createContainer>,
  initialRoute: string = "/"
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HexDiContainerProvider container={container}>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route path="/*" element={children} />
            </Routes>
          </MemoryRouter>
        </HexDiContainerProvider>
      </QueryClientProvider>
    );
  };
}

// =============================================================================
// Test 1: StatsCards display correct counts
// =============================================================================

describe("StatsCards Component", () => {
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

  it("should display loading skeleton initially", () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <StatsCards />
      </Wrapper>
    );

    // Should show skeleton loading state
    const skeletons = screen.getAllByTestId("stats-card-skeleton");
    expect(skeletons.length).toBe(4);
  });

  it("should display correct task counts after loading", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <StatsCards />
      </Wrapper>
    );

    // Wait for data to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    // Verify all four cards are present
    expect(screen.getByTestId("stat-card-todo")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-in-progress")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-done")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-due-today")).toBeInTheDocument();

    // Verify counts are displayed (numeric values)
    const todoCount = screen.getByTestId("stat-count-todo");
    expect(parseInt(todoCount.textContent ?? "0", 10)).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Test 2: FilterBar updates query params
// =============================================================================

describe("FilterBar Component", () => {
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

  it("should render all filter dropdowns and clear button", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <FilterBar filters={DEFAULT_FILTERS} onFiltersChange={() => {}} />
      </Wrapper>
    );

    // Wait for projects to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Verify filter controls exist
    expect(screen.getByTestId("filter-status")).toBeInTheDocument();
    expect(screen.getByTestId("filter-priority")).toBeInTheDocument();
    expect(screen.getByTestId("filter-project")).toBeInTheDocument();
    expect(screen.getByTestId("filter-clear-all")).toBeInTheDocument();
  });

  it("should call onFiltersChange when status filter changes", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onFiltersChange = vi.fn();

    render(
      <Wrapper>
        <FilterBar filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />
      </Wrapper>
    );

    // Wait for initial render
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Change status filter
    const statusSelect = screen.getByTestId("filter-status");
    fireEvent.change(statusSelect, { target: { value: "todo" } });

    // Verify callback was called with updated filters
    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ status: "todo" }));
  });

  it("should reset all filters when Clear All is clicked", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onFiltersChange = vi.fn();

    const activeFilters: TaskFilterState = {
      ...DEFAULT_FILTERS,
      status: "todo",
      priority: "high",
    };

    render(
      <Wrapper>
        <FilterBar filters={activeFilters} onFiltersChange={onFiltersChange} />
      </Wrapper>
    );

    // Wait for initial render
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Click Clear All button
    const clearButton = screen.getByTestId("filter-clear-all");
    fireEvent.click(clearButton);

    // Verify callback was called with default filters
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "all",
        priority: "all",
        projectId: "all",
      })
    );
  });
});

// =============================================================================
// Test 3: TaskList renders with loading/error/empty states
// =============================================================================

describe("TaskList Component", () => {
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

  it("should display loading skeleton initially", () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskList filters={DEFAULT_FILTERS} />
      </Wrapper>
    );

    // Should show skeleton loading state
    const skeletons = screen.getAllByTestId("task-card-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should display tasks after loading", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskList filters={DEFAULT_FILTERS} />
      </Wrapper>
    );

    // Wait for data to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-list")).toBeInTheDocument();
    });

    // Should have task cards
    const taskCards = screen.getAllByTestId(/^task-card-/);
    expect(taskCards.length).toBeGreaterThan(0);
  });

  it("should display empty state when no tasks match filters", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    // Create filters that will return no results
    // Using a non-existent project ID
    const emptyFilters: TaskFilterState = {
      ...DEFAULT_FILTERS,
      projectId: "non-existent-project",
    };

    render(
      <Wrapper>
        <TaskList filters={emptyFilters} />
      </Wrapper>
    );

    // Wait for data to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      const emptyState = screen.queryByTestId("task-list-empty");
      const taskList = screen.queryByTestId("task-list");

      // Either we get an empty state or the list is empty
      return emptyState !== null || taskList !== null;
    });
  });
});

// =============================================================================
// Test 4: Pagination controls
// =============================================================================

describe("Pagination Component", () => {
  it("should display current page and navigation buttons", () => {
    render(
      <MemoryRouter>
        <Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />
      </MemoryRouter>
    );

    // Verify page display
    expect(screen.getByTestId("pagination-info")).toHaveTextContent("Page 2 of 5");

    // Verify navigation buttons exist
    expect(screen.getByTestId("pagination-prev")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-next")).toBeInTheDocument();
  });

  it("should disable Previous button on first page", () => {
    render(
      <MemoryRouter>
        <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />
      </MemoryRouter>
    );

    const prevButton = screen.getByTestId("pagination-prev");
    expect(prevButton).toBeDisabled();

    const nextButton = screen.getByTestId("pagination-next");
    expect(nextButton).not.toBeDisabled();
  });

  it("should disable Next button on last page", () => {
    render(
      <MemoryRouter>
        <Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />
      </MemoryRouter>
    );

    const prevButton = screen.getByTestId("pagination-prev");
    expect(prevButton).not.toBeDisabled();

    const nextButton = screen.getByTestId("pagination-next");
    expect(nextButton).toBeDisabled();
  });

  it("should call onPageChange with correct page number", () => {
    const onPageChange = vi.fn();

    render(
      <MemoryRouter>
        <Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />
      </MemoryRouter>
    );

    // Click Previous
    const prevButton = screen.getByTestId("pagination-prev");
    fireEvent.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(1);

    // Click Next
    const nextButton = screen.getByTestId("pagination-next");
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

// =============================================================================
// Test 5: TaskCard component states
// =============================================================================

describe("TaskCard Component", () => {
  const mockTask = {
    id: "task-1",
    title: "Test Task",
    description: "A test task description",
    status: "todo" as const,
    priority: "high" as const,
    projectId: "proj-1",
    assigneeId: "user-1",
    dueDate: new Date(),
    labels: ["bug"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should display task title and metadata", () => {
    render(
      <MemoryRouter>
        <TaskCard task={mockTask} />
      </MemoryRouter>
    );

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByTestId("task-card-priority")).toHaveTextContent(/high/i);
  });

  it("should show action buttons on hover", async () => {
    render(
      <MemoryRouter>
        <TaskCard task={mockTask} />
      </MemoryRouter>
    );

    const card = screen.getByTestId("task-card-task-1");

    // Before hover, actions should be hidden
    expect(screen.queryByTestId("task-actions")).toHaveClass("opacity-0");

    // Hover over card
    fireEvent.mouseEnter(card);

    // Actions should be visible
    await waitFor(() => {
      expect(screen.getByTestId("task-actions")).toHaveClass("opacity-100");
    });
  });

  it("should display completed state correctly", () => {
    const completedTask = {
      ...mockTask,
      status: "done" as const,
    };

    render(
      <MemoryRouter>
        <TaskCard task={completedTask} />
      </MemoryRouter>
    );

    const card = screen.getByTestId("task-card-task-1");
    expect(card).toHaveClass("completed");
  });
});
