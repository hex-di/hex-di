/**
 * Modal Components Tests
 *
 * Tests for the modal system components:
 * 1. Modal base component - Open/close transitions, keyboard handling
 * 2. ConfirmationModal - Callback execution
 * 3. QuickEditModal - Form submission
 * 4. Modal stacking - Nested modal behavior
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
  FilterStoreAdapter,
} from "../../src/taskflow/index.js";

import {
  Modal,
  ConfirmationModal,
  QuickEditModal,
  NotificationModal,
  ModalProvider,
  useModal,
} from "../../src/taskflow/components/modals/index.js";

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Creates a test environment with container and query client.
 */
function createTestEnv() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const graph = GraphBuilder.create()
    .provide(TaskApiServiceAdapter)
    .provide(createTaskCacheServiceAdapter(queryClient))
    .provide(FilterStoreAdapter)
    .build();

  const container = createContainer(graph, { name: "Test" });

  return { queryClient, container };
}

/**
 * Test wrapper component providing all necessary context.
 */
function createWrapper(queryClient: QueryClient, container: ReturnType<typeof createContainer>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HexDiContainerProvider container={container}>
          <MemoryRouter>
            <ModalProvider>
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

// =============================================================================
// Test 1: Modal base component open/close transitions
// =============================================================================

describe("Modal Base Component", () => {
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

  it("should open with animation when isOpen changes to true", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setIsOpen(true)}>Open Modal</button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test Modal">
            <p>Modal Content</p>
          </Modal>
        </>
      );
    }

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    // Modal should not be visible initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(screen.getByText("Open Modal"));

    // Modal should appear with opening animation
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Wait for animation to complete
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    // Modal content should be visible
    expect(screen.getByText("Modal Content")).toBeInTheDocument();
  });

  it("should close when close button is clicked", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onClose = vi.fn();

    render(
      <Wrapper>
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal Content</p>
        </Modal>
      </Wrapper>
    );

    // Wait for modal to be open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Wait for animation to complete
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    // Click the close button
    const closeButton = screen.getByLabelText("Close modal");
    fireEvent.click(closeButton);

    // onClose should be called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should close when backdrop is clicked (if configured)", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onClose = vi.fn();

    render(
      <Wrapper>
        <Modal isOpen={true} onClose={onClose} title="Test Modal" closeOnBackdropClick={true}>
          <p>Modal Content</p>
        </Modal>
      </Wrapper>
    );

    // Wait for modal to be open
    await waitFor(() => {
      expect(screen.getByTestId("modal-backdrop")).toBeInTheDocument();
    });

    // Click backdrop
    fireEvent.click(screen.getByTestId("modal-backdrop"));

    // onClose should be called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should NOT close when backdrop is clicked if closeOnBackdropClick is false", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onClose = vi.fn();

    render(
      <Wrapper>
        <Modal isOpen={true} onClose={onClose} title="Test Modal" closeOnBackdropClick={false}>
          <p>Modal Content</p>
        </Modal>
      </Wrapper>
    );

    // Wait for modal to be open
    await waitFor(() => {
      expect(screen.getByTestId("modal-backdrop")).toBeInTheDocument();
    });

    // Click backdrop
    fireEvent.click(screen.getByTestId("modal-backdrop"));

    // onClose should NOT be called
    expect(onClose).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Test 2: ConfirmationModal callback execution
// =============================================================================

describe("ConfirmationModal Component", () => {
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

  it("should execute onConfirm when confirm button is clicked", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <Wrapper>
        <ConfirmationModal
          isOpen={true}
          title="Delete Task"
          message="Are you sure you want to delete this task?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </Wrapper>
    );

    // Wait for modal to be open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click confirm button
    fireEvent.click(screen.getByTestId("confirmation-confirm-btn"));

    // onConfirm should be called
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("should execute onCancel when cancel button is clicked", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <Wrapper>
        <ConfirmationModal
          isOpen={true}
          title="Delete Task"
          message="Are you sure you want to delete this task?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </Wrapper>
    );

    // Wait for modal to be open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click cancel button
    fireEvent.click(screen.getByTestId("confirmation-cancel-btn"));

    // onCancel should be called
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should display item preview when provided", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <ConfirmationModal
          isOpen={true}
          title="Delete Task"
          message="Are you sure you want to delete this task?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => {}}
          onCancel={() => {}}
          itemPreview={{
            name: "Fix login timeout issue",
            description: "Due: Today | @Sarah",
          }}
        />
      </Wrapper>
    );

    // Wait for modal to be open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Item preview should be displayed
    expect(screen.getByTestId("confirmation-item-preview")).toBeInTheDocument();
    expect(screen.getByText("Fix login timeout issue")).toBeInTheDocument();
  });
});

// =============================================================================
// Test 3: QuickEditModal form submission
// =============================================================================

describe("QuickEditModal Component", () => {
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

  it("should submit form with updated values", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onSave = vi.fn();
    const onCancel = vi.fn();

    const mockTask = {
      id: "task-1",
      title: "Original Title",
      status: "todo" as const,
      priority: "medium" as const,
      assigneeId: "user-1",
      description: null,
      dueDate: null,
      projectId: "proj-1",
      labels: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <Wrapper>
        <QuickEditModal
          isOpen={true}
          task={mockTask}
          onSave={onSave}
          onCancel={onCancel}
          onOpenFullView={() => {}}
        />
      </Wrapper>
    );

    // Wait for modal to be open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Wait for project data to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Change the title
    const titleInput = screen.getByTestId("quick-edit-title");
    fireEvent.change(titleInput, { target: { value: "Updated Title" } });

    // Change status
    const statusSelect = screen.getByTestId("quick-edit-status");
    fireEvent.change(statusSelect, { target: { value: "in-progress" } });

    // Click save
    fireEvent.click(screen.getByTestId("quick-edit-save-btn"));

    // onSave should be called with updated values
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task-1",
        title: "Updated Title",
        status: "in-progress",
      })
    );
  });

  it("should have an Open Full View link", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onOpenFullView = vi.fn();

    const mockTask = {
      id: "task-1",
      title: "Test Task",
      status: "todo" as const,
      priority: "medium" as const,
      assigneeId: null,
      description: null,
      dueDate: null,
      projectId: "proj-1",
      labels: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <Wrapper>
        <QuickEditModal
          isOpen={true}
          task={mockTask}
          onSave={() => {}}
          onCancel={() => {}}
          onOpenFullView={onOpenFullView}
        />
      </Wrapper>
    );

    // Wait for modal to be open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click Open Full View link
    fireEvent.click(screen.getByTestId("quick-edit-full-view-link"));

    // onOpenFullView should be called
    expect(onOpenFullView).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Test 4: Modal stacking behavior
// =============================================================================

describe("Modal Stacking Behavior", () => {
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

  it("should support nested modals via useModal hook", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    function NestedModalTest() {
      const { openConfirmation, showNotification } = useModal();

      const handleOpenFirst = () => {
        openConfirmation({
          title: "First Modal",
          message: "This is the first modal",
          confirmLabel: "Open Second",
          cancelLabel: "Cancel",
          variant: "info",
          onConfirm: () => {
            openConfirmation({
              title: "Second Modal",
              message: "This is the nested modal",
              confirmLabel: "Confirm",
              cancelLabel: "Cancel",
              variant: "danger",
              onConfirm: () => {
                showNotification({
                  title: "Success",
                  message: "Both modals completed",
                  variant: "success",
                });
              },
              onCancel: () => {},
            });
          },
          onCancel: () => {},
        });
      };

      return <button onClick={handleOpenFirst}>Open First Modal</button>;
    }

    render(
      <Wrapper>
        <NestedModalTest />
      </Wrapper>
    );

    // Click to open first modal
    fireEvent.click(screen.getByText("Open First Modal"));

    // First modal should be visible
    await waitFor(() => {
      expect(screen.getByText("First Modal")).toBeInTheDocument();
    });

    // Wait for animation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    // Click confirm to open second modal
    fireEvent.click(screen.getByText("Open Second"));

    // Wait for animation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    // Second modal should be visible (first may still be rendered behind)
    await waitFor(() => {
      expect(screen.getByText("Second Modal")).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Test 5: NotificationModal auto-dismiss
// =============================================================================

describe("NotificationModal Component", () => {
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

  it("should auto-dismiss after specified duration", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onDismiss = vi.fn();

    render(
      <Wrapper>
        <NotificationModal
          isOpen={true}
          title="Task Completed"
          message="Your task has been marked as complete"
          variant="success"
          autoDismissMs={3000}
          onDismiss={onDismiss}
        />
      </Wrapper>
    );

    // Modal should be visible
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Advance time to trigger auto-dismiss
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    // onDismiss should be called
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("should support undo action", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onUndo = vi.fn();

    render(
      <Wrapper>
        <NotificationModal
          isOpen={true}
          title="Task Completed"
          message="Your task has been marked as complete"
          variant="success"
          onDismiss={() => {}}
          undoAction={onUndo}
        />
      </Wrapper>
    );

    // Modal should be visible
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Undo button should be visible
    const undoButton = screen.getByTestId("notification-undo-btn");
    expect(undoButton).toBeInTheDocument();

    // Click undo
    fireEvent.click(undoButton);

    // onUndo should be called
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("should display correct variant styling", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    const { rerender } = render(
      <Wrapper>
        <NotificationModal
          isOpen={true}
          title="Success"
          message="Operation successful"
          variant="success"
          onDismiss={() => {}}
        />
      </Wrapper>
    );

    // Wait for modal and animation to complete
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    // Success variant should have success styling
    expect(screen.getByTestId("notification-icon")).toHaveClass("text-green-500");

    // Rerender with error variant
    rerender(
      <Wrapper>
        <NotificationModal
          isOpen={true}
          title="Error"
          message="Operation failed"
          variant="error"
          onDismiss={() => {}}
        />
      </Wrapper>
    );

    // Wait for rerender
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    // Error variant should have error styling
    await waitFor(() => {
      expect(screen.getByTestId("notification-icon")).toHaveClass("text-red-500");
    });
  });
});
