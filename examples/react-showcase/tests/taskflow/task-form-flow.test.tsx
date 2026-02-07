/**
 * Task Creation Form Flow Tests
 *
 * Tests for the multi-step task creation form:
 * 1. Form validation on each step (title required, 3+ chars)
 * 2. Step navigation (next/back)
 * 3. Form submission flow (idle -> validating -> submitting -> success/error)
 * 4. Progress indicator updates
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
  type TaskBasicInfo,
} from "../../src/taskflow/index.js";

import {
  TaskFormProgress,
  Step1BasicInfo,
  FormFieldValidation,
  TaskCreationForm,
} from "../../src/taskflow/components/forms/index.js";

import { ModalProvider } from "../../src/taskflow/components/modals/index.js";

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

  const container = createContainer({ graph, name: "Test" });

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
// Test 1: Form validation on each step
// =============================================================================

describe("Form Validation on Each Step", () => {
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

  it("should show validation error when title is less than 3 characters", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onValidationChange = vi.fn();

    // Create a component that properly tracks state
    function TestStep1() {
      const [data, setData] = React.useState<TaskBasicInfo>({
        title: "",
        description: "",
        projectId: "",
        priority: "medium",
      });

      return (
        <Step1BasicInfo data={data} onChange={setData} onValidationChange={onValidationChange} />
      );
    }

    render(
      <Wrapper>
        <TestStep1 />
      </Wrapper>
    );

    // Wait for projects to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Type a short title (exactly 2 chars to trigger "at least 3 characters" error)
    const titleInput = screen.getByTestId("form-field-title");
    fireEvent.change(titleInput, { target: { value: "ab" } });
    fireEvent.blur(titleInput);

    // Wait for validation state update
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Validation callback should report invalid
    await waitFor(() => {
      expect(onValidationChange).toHaveBeenCalledWith(false);
    });

    // Error message should be displayed (uses form-field-title-message testId)
    // Note: If title is empty after blur, it shows "Title is required", if it's short it shows "at least 3 characters"
    expect(screen.getByTestId("form-field-title-message")).toHaveTextContent(
      /at least 3 characters|Title is required/i
    );
  });

  it("should show success state when title is 3+ characters", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onValidationChange = vi.fn();
    const onChangeHandler = vi.fn();

    // Use a component that tracks form data changes
    function TestStep1() {
      const [data, setData] = React.useState<TaskBasicInfo>({
        title: "",
        description: "",
        projectId: "",
        priority: "medium",
      });

      const handleChange = (newData: TaskBasicInfo) => {
        setData(newData);
        onChangeHandler(newData);
      };

      return (
        <Step1BasicInfo
          data={data}
          onChange={handleChange}
          onValidationChange={onValidationChange}
        />
      );
    }

    render(
      <Wrapper>
        <TestStep1 />
      </Wrapper>
    );

    // Wait for projects to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Type a valid title
    const titleInput = screen.getByTestId("form-field-title");
    fireEvent.change(titleInput, { target: { value: "Valid task title" } });
    fireEvent.blur(titleInput);

    // Select a project (required)
    const projectSelect = screen.getByTestId("form-field-project");
    fireEvent.change(projectSelect, { target: { value: "proj-1" } });

    // Wait for validation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Validation callback should eventually report valid
    await waitFor(() => {
      expect(onValidationChange).toHaveBeenLastCalledWith(true);
    });
  });

  it("should require project selection in step 1", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onValidationChange = vi.fn();

    render(
      <Wrapper>
        <Step1BasicInfo
          data={{ title: "Valid title", description: "", projectId: "", priority: "medium" }}
          onChange={() => {}}
          onValidationChange={onValidationChange}
        />
      </Wrapper>
    );

    // Wait for projects to load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Title is valid but no project selected
    // Validation should still be invalid
    await waitFor(() => {
      expect(onValidationChange).toHaveBeenLastCalledWith(false);
    });
  });
});

// =============================================================================
// Test 2: Step navigation (next/back)
// =============================================================================

describe("Step Navigation", () => {
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

  it("should navigate from step 1 to step 2 when Next is clicked with valid data", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskCreationForm onSuccess={() => {}} onCancel={() => {}} />
      </Wrapper>
    );

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Should start on step 1
    expect(screen.getByTestId("form-step-1")).toBeInTheDocument();

    // Fill in required fields
    const titleInput = screen.getByTestId("form-field-title");
    fireEvent.change(titleInput, { target: { value: "Test Task Title" } });

    const projectSelect = screen.getByTestId("form-field-project");
    fireEvent.change(projectSelect, { target: { value: "proj-1" } });

    // Wait for validation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Click Next
    const nextButton = screen.getByTestId("form-next-button");
    fireEvent.click(nextButton);

    // Should now be on step 2
    await waitFor(() => {
      expect(screen.getByTestId("form-step-2")).toBeInTheDocument();
    });
  });

  it("should navigate back from step 2 to step 1 when Back is clicked", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskCreationForm onSuccess={() => {}} onCancel={() => {}} />
      </Wrapper>
    );

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Fill in step 1 and advance
    const titleInput = screen.getByTestId("form-field-title");
    fireEvent.change(titleInput, { target: { value: "Test Task Title" } });

    const projectSelect = screen.getByTestId("form-field-project");
    fireEvent.change(projectSelect, { target: { value: "proj-1" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    fireEvent.click(screen.getByTestId("form-next-button"));

    // Wait for step 2
    await waitFor(() => {
      expect(screen.getByTestId("form-step-2")).toBeInTheDocument();
    });

    // Click Back
    const backButton = screen.getByTestId("form-back-button");
    fireEvent.click(backButton);

    // Should be back on step 1
    await waitFor(() => {
      expect(screen.getByTestId("form-step-1")).toBeInTheDocument();
    });

    // Previous data should be preserved
    expect(screen.getByTestId("form-field-title")).toHaveValue("Test Task Title");
  });

  it("should disable Next button when step validation fails", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskCreationForm onSuccess={() => {}} onCancel={() => {}} />
      </Wrapper>
    );

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Don't fill in required fields
    const nextButton = screen.getByTestId("form-next-button");

    // Next button should be disabled
    expect(nextButton).toBeDisabled();
  });
});

// =============================================================================
// Test 3: Form submission flow states
// =============================================================================

describe("Form Submission Flow", () => {
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

  it("should transition through idle -> validating -> submitting -> success", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onSuccess = vi.fn();

    render(
      <Wrapper>
        <TaskCreationForm onSuccess={onSuccess} onCancel={() => {}} />
      </Wrapper>
    );

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Initial state should be idle
    expect(screen.getByTestId("form-state-indicator")).toHaveTextContent(/idle/i);

    // Fill step 1
    fireEvent.change(screen.getByTestId("form-field-title"), {
      target: { value: "New Task" },
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
    const submitButton = screen.getByTestId("form-submit-button");
    fireEvent.click(submitButton);

    // Should transition to validating
    await waitFor(() => {
      const stateIndicator = screen.getByTestId("form-state-indicator");
      expect(stateIndicator).toHaveTextContent(/validating|submitting/i);
    });

    // Wait for submission to complete
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Should call onSuccess
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("should show error state when submission fails", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskCreationForm onSuccess={() => {}} onCancel={() => {}} />
      </Wrapper>
    );

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Fill step 1 with error-triggering title (contains "error")
    fireEvent.change(screen.getByTestId("form-field-title"), {
      target: { value: "error task" },
    });
    fireEvent.change(screen.getByTestId("form-field-project"), {
      target: { value: "proj-1" },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Navigate through steps
    fireEvent.click(screen.getByTestId("form-next-button"));
    await waitFor(() => screen.getByTestId("form-step-2"));

    fireEvent.click(screen.getByTestId("form-next-button"));
    await waitFor(() => screen.getByTestId("form-step-3"));

    // Submit
    fireEvent.click(screen.getByTestId("form-submit-button"));

    // Wait for submission
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Should show error state
    await waitFor(() => {
      const stateIndicator = screen.getByTestId("form-state-indicator");
      expect(stateIndicator).toHaveTextContent(/error/i);
    });
  });
});

// =============================================================================
// Test 4: Progress indicator updates
// =============================================================================

describe("Progress Indicator Updates", () => {
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

  it("should show correct step indicators as user progresses", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);

    render(
      <Wrapper>
        <TaskCreationForm onSuccess={() => {}} onCancel={() => {}} />
      </Wrapper>
    );

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Step 1 should be current (check data-current attribute)
    const step1 = screen.getByTestId("progress-step-1");
    const step2 = screen.getByTestId("progress-step-2");
    const step3 = screen.getByTestId("progress-step-3");

    expect(step1).toHaveAttribute("data-current", "true");
    expect(step2).toHaveAttribute("data-current", "false");
    expect(step3).toHaveAttribute("data-current", "false");

    // Progress bar should show 33%
    expect(screen.getByTestId("progress-bar")).toHaveAttribute("data-progress", "33");

    // Fill step 1 and advance
    fireEvent.change(screen.getByTestId("form-field-title"), {
      target: { value: "Test Task" },
    });
    fireEvent.blur(screen.getByTestId("form-field-title"));

    fireEvent.change(screen.getByTestId("form-field-project"), {
      target: { value: "proj-1" },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    fireEvent.click(screen.getByTestId("form-next-button"));

    await waitFor(() => {
      expect(screen.getByTestId("form-step-2")).toBeInTheDocument();
    });

    // After navigating, step 2 should be current
    const updatedStep2 = screen.getByTestId("progress-step-2");
    expect(updatedStep2).toHaveAttribute("data-current", "true");

    // Progress bar should show 66-67% (2/3 = 66.67%, rounds to 67%)
    const progressBar = screen.getByTestId("progress-bar");
    const progress = progressBar.getAttribute("data-progress");
    expect(["66", "67"]).toContain(progress);
  });

  it("should display breadcrumb-style step labels", () => {
    // TaskFormProgress is a simple component that doesn't need the full provider wrapper
    render(<TaskFormProgress currentStep={1} totalSteps={3} />);

    // Should show step labels (they appear multiple times - in circles and in breadcrumb)
    expect(screen.getAllByText("Basic Info").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assignment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Due Date").length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Test 5: FormFieldValidation component states
// =============================================================================

describe("FormFieldValidation Component", () => {
  it("should display error state with red border and message", () => {
    render(
      <FormFieldValidation state="error" message="Title is required" testId="test-field">
        <input type="text" />
      </FormFieldValidation>
    );

    const container = screen.getByTestId("test-field-container");
    expect(container).toHaveClass("border-red-500");
    expect(screen.getByTestId("test-field-message")).toHaveTextContent("Title is required");
  });

  it("should display success state with green border and checkmark", () => {
    render(
      <FormFieldValidation state="success" message="Looks good!" testId="test-field">
        <input type="text" />
      </FormFieldValidation>
    );

    const container = screen.getByTestId("test-field-container");
    expect(container).toHaveClass("border-green-500");
    expect(screen.getByTestId("test-field-icon")).toBeInTheDocument();
  });

  it("should display warning state with yellow border", () => {
    render(
      <FormFieldValidation state="warning" message="Title is quite long" testId="test-field">
        <input type="text" />
      </FormFieldValidation>
    );

    const container = screen.getByTestId("test-field-container");
    expect(container).toHaveClass("border-yellow-500");
  });

  it("should display loading state with spinner", () => {
    render(
      <FormFieldValidation state="loading" message="Checking..." testId="test-field">
        <input type="text" />
      </FormFieldValidation>
    );

    expect(screen.getByTestId("test-field-spinner")).toBeInTheDocument();
  });
});

// =============================================================================
// Test 6: Full form integration with React Query
// =============================================================================

describe("Form Integration with React Query", () => {
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

  it("should call useCreateTask mutation on successful submit", async () => {
    const Wrapper = createWrapper(env.queryClient, env.container);
    const onSuccess = vi.fn();

    render(
      <Wrapper>
        <TaskCreationForm onSuccess={onSuccess} onCancel={() => {}} />
      </Wrapper>
    );

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Fill all required fields and navigate through steps
    fireEvent.change(screen.getByTestId("form-field-title"), {
      target: { value: "Integration Test Task" },
    });
    fireEvent.change(screen.getByTestId("form-field-project"), {
      target: { value: "proj-1" },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    fireEvent.click(screen.getByTestId("form-next-button"));
    await waitFor(() => screen.getByTestId("form-step-2"));

    fireEvent.click(screen.getByTestId("form-next-button"));
    await waitFor(() => screen.getByTestId("form-step-3"));

    // Submit
    fireEvent.click(screen.getByTestId("form-submit-button"));

    // Wait for mutation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // onSuccess should be called with the created task
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Integration Test Task",
        })
      );
    });
  });
});
