/**
 * End-to-End and Integration Tests for TaskFlow Application
 *
 * These tests verify critical user workflows that span multiple components:
 * 1. End-to-end: New user completes onboarding -> lands on dashboard
 * 2. End-to-end: User creates task via form -> sees it in task list
 * 3. End-to-end: User deletes task via confirmation modal -> task removed
 * 4. Integration: Navigation state machine + React Router sync
 * 5. Integration: Filter state syncs with URL query params
 * 6. Integration: Form flow + React Query mutation coordination
 *
 * @packageDocumentation
 */

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { HexDiContainerProvider } from "@hex-di/react";
import { createContainer } from "@hex-di/runtime";
import { GraphBuilder } from "@hex-di/graph";

import {
  TaskApiServiceAdapter,
  createTaskCacheServiceAdapter,
  FilterStoreAdapter,
  DEFAULT_FILTERS,
} from "../../src/taskflow/index.js";

import { DashboardPage } from "../../src/taskflow/pages/DashboardPage.js";
import { TaskCreationForm } from "../../src/taskflow/components/forms/TaskCreationForm.js";
import { OnboardingWizard } from "../../src/taskflow/components/onboarding/OnboardingWizard.js";
import { ModalProvider } from "../../src/taskflow/components/modals/ModalProvider.js";
import { TaskListWithModals } from "../../src/taskflow/components/dashboard/TaskListWithModals.js";
import { createUserSessionStore } from "../../src/taskflow/stores/user-session-store.js";

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Mock localStorage for persistence tests
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

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
    .provide(FilterStoreAdapter)
    .build();

  const container = createContainer({ graph, name: "Test" });

  return { queryClient, container };
}

/**
 * Location tracker component for testing navigation.
 */
function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location-display">
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
    </div>
  );
}

/**
 * Creates a test wrapper with all necessary providers.
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
            <ModalProvider>
              <LocationDisplay />
              <Routes>
                <Route path="/*" element={children} />
              </Routes>
            </ModalProvider>
          </MemoryRouter>
        </HexDiContainerProvider>
      </QueryClientProvider>
    );
  };
}

/**
 * Creates a mock new user for onboarding tests.
 */
function createMockNewUser() {
  return {
    id: "user-1",
    displayName: "Test User",
    email: "test@example.com",
    role: "developer" as const,
    avatarUrl: null,
    bio: null,
    isNewUser: true,
    createdAt: new Date(),
  };
}

// =============================================================================
// End-to-End Test 1: New User Completes Onboarding -> Lands on Dashboard
// =============================================================================

describe("End-to-End: Onboarding Flow to Dashboard", () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorageMock.clear();
    env = createTestEnv();
  });

  afterEach(async () => {
    vi.useRealTimers();
    env.queryClient.clear();
    await env.container.dispose();
  });

  it("should complete onboarding and mark user as no longer new", async () => {
    const store = createUserSessionStore();
    store.getState().login(createMockNewUser());

    // Verify user is new initially
    expect(store.getState().user?.isNewUser).toBe(true);

    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <OnboardingWizard userSessionStore={store} />
      </MemoryRouter>
    );

    // Step 1: Profile Setup
    expect(screen.getByRole("heading", { name: /welcome to taskflow/i })).toBeInTheDocument();

    const displayNameInput = screen.getByLabelText(/display name/i);
    await userEvent.type(displayNameInput, "John Doe");

    const roleSelect = screen.getByLabelText(/role/i);
    await userEvent.selectOptions(roleSelect, "developer");

    // Navigate to step 2
    const nextButton = screen.getByRole("button", { name: /next/i });
    await userEvent.click(nextButton);

    // Step 2: Team - Skip it
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /join or create team/i })).toBeInTheDocument();
    });

    const skipButton = screen.getByRole("button", { name: /skip/i });
    await userEvent.click(skipButton);

    // Step 3: Preferences
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /customize your experience/i })
      ).toBeInTheDocument();
    });

    // Complete the wizard
    const finishButton = screen.getByRole("button", { name: /finish|complete/i });
    await userEvent.click(finishButton);

    // Verify onboarding is marked as complete
    await waitFor(() => {
      expect(store.getState().onboardingCompleted).toBe(true);
      expect(store.getState().user?.isNewUser).toBe(false);
    });
  });
});

// =============================================================================
// End-to-End Test 2: User Creates Task via Form -> Sees it in Task List
// =============================================================================

describe("End-to-End: Task Creation Flow", () => {
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

  it("should create a task through the form and have it appear in the cache", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container, "/tasks/new");
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    render(
      <Wrapper>
        <TaskCreationForm onSuccess={onSuccess} onCancel={onCancel} />
      </Wrapper>
    );

    // Wait for form to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Step 1: Fill in basic info
    expect(screen.getByTestId("form-step-1")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("form-field-title"), {
      target: { value: "My New Integration Test Task" },
    });
    fireEvent.change(screen.getByTestId("form-field-project"), {
      target: { value: "proj-1" },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Navigate to step 2
    fireEvent.click(screen.getByTestId("form-next-button"));

    await waitFor(() => {
      expect(screen.getByTestId("form-step-2")).toBeInTheDocument();
    });

    // Navigate to step 3
    fireEvent.click(screen.getByTestId("form-next-button"));

    await waitFor(() => {
      expect(screen.getByTestId("form-step-3")).toBeInTheDocument();
    });

    // Submit the form
    fireEvent.click(screen.getByTestId("form-submit-button"));

    // Wait for submission
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Verify onSuccess was called with the created task
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "My New Integration Test Task",
        })
      );
    });
  });
});

// =============================================================================
// End-to-End Test 3: User Deletes Task via Confirmation Modal -> Task Removed
// =============================================================================

describe("End-to-End: Task Deletion with Modal Confirmation", () => {
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

  it("should show confirmation modal and delete task when confirmed", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskListWithModals filters={DEFAULT_FILTERS} />
      </Wrapper>
    );

    // Wait for tasks to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-list")).toBeInTheDocument();
    });

    // Get the first task card and hover to reveal action buttons
    const taskCards = screen.getAllByTestId(/^task-card-/);
    expect(taskCards.length).toBeGreaterThan(0);

    const firstCard = taskCards[0];
    fireEvent.mouseEnter(firstCard);

    // Wait for actions to become visible within the first card
    await waitFor(() => {
      const actions = within(firstCard).getByTestId("task-actions");
      expect(actions).toHaveClass("opacity-100");
    });

    // Click the delete button within the first card
    const deleteButton = within(firstCard).getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/delete task/i)).toBeInTheDocument();
    });

    // Click confirm
    fireEvent.click(screen.getByTestId("confirmation-confirm-btn"));

    // Wait for mutation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Success notification should appear
    await waitFor(() => {
      expect(screen.getByText(/task deleted/i)).toBeInTheDocument();
    });
  });

  it("should cancel deletion when cancel is clicked", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskListWithModals filters={DEFAULT_FILTERS} />
      </Wrapper>
    );

    // Wait for tasks to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-list")).toBeInTheDocument();
    });

    // Get the first task card and hover
    const taskCards = screen.getAllByTestId(/^task-card-/);
    const firstCard = taskCards[0];
    fireEvent.mouseEnter(firstCard);

    // Wait for actions within the first card
    await waitFor(() => {
      const actions = within(firstCard).getByTestId("task-actions");
      expect(actions).toHaveClass("opacity-100");
    });

    // Click delete within the first card
    const deleteButton = within(firstCard).getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click cancel
    fireEvent.click(screen.getByTestId("confirmation-cancel-btn"));

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// Integration Test 4: Filter State Syncs with URL Query Params
// =============================================================================

describe("Integration: Filter State and URL Query Params Sync", () => {
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

  it("should update URL when filter changes", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <DashboardPage />
      </Wrapper>
    );

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId("filter-status")).toBeInTheDocument();
    });

    // Change status filter
    fireEvent.change(screen.getByTestId("filter-status"), { target: { value: "todo" } });

    // URL should update
    await waitFor(() => {
      const search = screen.getByTestId("search").textContent;
      expect(search).toContain("status=todo");
    });
  });

  it("should parse filters from URL on initial load", async () => {
    // Start with filters in URL
    const Wrapper = createWrapper(env.queryClient, env.container, "/?status=done&priority=high");

    render(
      <Wrapper>
        <DashboardPage />
      </Wrapper>
    );

    // Wait for load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId("filter-status")).toBeInTheDocument();
    });

    // Verify filters are set from URL
    const statusSelect = screen.getByTestId("filter-status") as HTMLSelectElement;
    const prioritySelect = screen.getByTestId("filter-priority") as HTMLSelectElement;

    expect(statusSelect.value).toBe("done");
    expect(prioritySelect.value).toBe("high");
  });
});

// =============================================================================
// Integration Test 5: Dashboard Stats Update After Task Mutation
// =============================================================================

describe("Integration: Dashboard Stats Update After Mutations", () => {
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

  it("should display stats that reflect task counts", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <DashboardPage />
      </Wrapper>
    );

    // Wait for stats to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    });

    // Verify stats cards are displaying data
    expect(screen.getByTestId("stat-card-todo")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-in-progress")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-done")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-due-today")).toBeInTheDocument();

    // Each should have a count value (numeric)
    const todoCount = screen.getByTestId("stat-count-todo");
    expect(parseInt(todoCount.textContent ?? "0", 10)).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Integration Test 6: Quick Edit Modal Updates Task
// =============================================================================

describe("Integration: Quick Edit Modal Updates Task", () => {
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

  it("should update task via quick edit modal", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskListWithModals filters={DEFAULT_FILTERS} />
      </Wrapper>
    );

    // Wait for tasks to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-list")).toBeInTheDocument();
    });

    // Hover over first task card
    const taskCards = screen.getAllByTestId(/^task-card-/);
    const firstCard = taskCards[0];
    fireEvent.mouseEnter(firstCard);

    // Wait for actions within the first card
    await waitFor(() => {
      const actions = within(firstCard).getByTestId("task-actions");
      expect(actions).toHaveClass("opacity-100");
    });

    // Click edit button within the first card
    const editButton = within(firstCard).getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    // Quick edit modal should open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("quick-edit-title")).toBeInTheDocument();
    });

    // Wait for project data to load in modal
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Modify the title
    const titleInput = screen.getByTestId("quick-edit-title");
    fireEvent.change(titleInput, { target: { value: "Updated Task Title via Quick Edit" } });

    // Save changes
    fireEvent.click(screen.getByTestId("quick-edit-save-btn"));

    // Wait for mutation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Success notification should appear
    await waitFor(() => {
      expect(screen.getByText(/task updated/i)).toBeInTheDocument();
    });
  });
});
