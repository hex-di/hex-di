import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { ResultAsync, ok, err, type Result } from "@hex-di/result";
import {
  createMutationPort,
  createQueryClient,
  type QueryClient,
  type QueryResolutionError,
} from "@hex-di/query";
import { QueryClientProvider, useMutation } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Ports & Helpers
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

interface CreateUserInput {
  readonly name: string;
}

const CreateUserPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "TestCreateUser",
});

const FailingPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "TestFailingMutation",
});

function createSuccessClient(): QueryClient {
  const container = createTestContainer();
  container.register(CreateUserPort, (input: CreateUserInput) =>
    ResultAsync.ok({ id: "new-1", name: input.name })
  );
  container.register(FailingPort, () =>
    ResultAsync.err({ _tag: "ApiError", message: "Server error" })
  );
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Idle State
// =============================================================================

describe("useMutation - idle state", () => {
  it("starts in idle status", () => {
    const client = createSuccessClient();
    let capturedStatus: string | undefined;

    function TestComponent() {
      const result = useMutation(CreateUserPort);
      capturedStatus = result.status;
      return <div>{result.status}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(capturedStatus).toBe("idle");
    expect(screen.getByText("idle")).toBeDefined();
    client.dispose();
  });

  it("has correct initial boolean flags", () => {
    const client = createSuccessClient();
    let flags: Record<string, boolean> = {};

    function TestComponent() {
      const result = useMutation(CreateUserPort);
      flags = {
        isIdle: result.isIdle,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
      };
      return <div>test</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(flags.isIdle).toBe(true);
    expect(flags.isPending).toBe(false);
    expect(flags.isSuccess).toBe(false);
    expect(flags.isError).toBe(false);
    client.dispose();
  });

  it("has undefined data and variables initially", () => {
    const client = createSuccessClient();
    let capturedData: User | undefined = { id: "x", name: "x" };
    let capturedVariables: CreateUserInput | undefined = { name: "x" };

    function TestComponent() {
      const result = useMutation(CreateUserPort);
      capturedData = result.data;
      capturedVariables = result.variables;
      return <div>test</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(capturedData).toBeUndefined();
    expect(capturedVariables).toBeUndefined();
    client.dispose();
  });
});

// =============================================================================
// Successful Mutation
// =============================================================================

describe("useMutation - success", () => {
  it("transitions to pending then success on mutate()", async () => {
    const client = createSuccessClient();
    const statusHistory: string[] = [];

    function TestComponent() {
      const { mutate, status, data } = useMutation(CreateUserPort);
      statusHistory.push(status);

      return (
        <div>
          <span data-testid="status">{status}</span>
          {data && <span data-testid="name">{data.name}</span>}
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Go"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("success");
    });

    expect(screen.getByTestId("name").textContent).toBe("Alice");
    client.dispose();
  });

  it("provides data on success", async () => {
    const client = createSuccessClient();

    function TestComponent() {
      const { mutate, isSuccess, data } = useMutation(CreateUserPort);

      return (
        <div>
          <button onClick={() => mutate({ name: "Bob" })}>Create</button>
          {isSuccess && data && <span>Created: {data.name}</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByText("Created: Bob")).toBeDefined();
    });

    client.dispose();
  });

  it("tracks variables after mutation", async () => {
    const client = createSuccessClient();
    let capturedVariables: CreateUserInput | undefined;

    function TestComponent() {
      const { mutate, variables, isSuccess } = useMutation(CreateUserPort);
      if (isSuccess) capturedVariables = variables;

      return (
        <div>
          <button onClick={() => mutate({ name: "Charlie" })}>Create</button>
          {isSuccess && <span>Done</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByText("Done")).toBeDefined();
    });

    expect(capturedVariables).toEqual({ name: "Charlie" });
    client.dispose();
  });
});

// =============================================================================
// Failed Mutation
// =============================================================================

describe("useMutation - error", () => {
  it("transitions to error state on failure", async () => {
    const client = createSuccessClient();

    function TestComponent() {
      const { mutate, isError, error } = useMutation(FailingPort);

      return (
        <div>
          <button onClick={() => mutate({ name: "Fail" })}>Go</button>
          {isError && error && <span>Error: {(error as ApiError).message}</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Go"));
    });

    await waitFor(() => {
      expect(screen.getByText("Error: Server error")).toBeDefined();
    });

    client.dispose();
  });

  it("has undefined data on error", async () => {
    const client = createSuccessClient();
    let capturedData: User | undefined = { id: "x", name: "x" };

    function TestComponent() {
      const { mutate, isError, data } = useMutation(FailingPort);
      if (isError) capturedData = data;

      return (
        <div>
          <button onClick={() => mutate({ name: "Fail" })}>Go</button>
          {isError && <span>Failed</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Go"));
    });

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeDefined();
    });

    expect(capturedData).toBeUndefined();
    client.dispose();
  });
});

// =============================================================================
// Lifecycle Callbacks
// =============================================================================

describe("useMutation - lifecycle callbacks", () => {
  it("calls onSuccess with data, input, and context", async () => {
    const client = createSuccessClient();
    const onSuccess = vi.fn();

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, { onSuccess });

      return (
        <div>
          <button onClick={() => mutate({ name: "Dan" })}>Create</button>
          {isSuccess && <span>Done</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByText("Done")).toBeDefined();
    });

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onSuccess.mock.calls[0][0]).toEqual({ id: "new-1", name: "Dan" });
    expect(onSuccess.mock.calls[0][1]).toEqual({ name: "Dan" });
    client.dispose();
  });

  it("calls onError with error, input, and context", async () => {
    const client = createSuccessClient();
    const onError = vi.fn();

    function TestComponent() {
      const { mutate, isError } = useMutation(FailingPort, { onError });

      return (
        <div>
          <button onClick={() => mutate({ name: "Fail" })}>Go</button>
          {isError && <span>Failed</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Go"));
    });

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeDefined();
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toEqual({ _tag: "ApiError", message: "Server error" });
    expect(onError.mock.calls[0][1]).toEqual({ name: "Fail" });
    client.dispose();
  });

  it("calls onSettled after success", async () => {
    const client = createSuccessClient();
    const onSettled = vi.fn();

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, { onSettled });

      return (
        <div>
          <button onClick={() => mutate({ name: "Eve" })}>Create</button>
          {isSuccess && <span>Done</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByText("Done")).toBeDefined();
    });

    expect(onSettled).toHaveBeenCalledOnce();
    // onSettled(data, error, input, context) — on success, error is null
    expect(onSettled.mock.calls[0][0]).toEqual({ id: "new-1", name: "Eve" });
    expect(onSettled.mock.calls[0][1]).toBeNull();
    expect(onSettled.mock.calls[0][2]).toEqual({ name: "Eve" });
    client.dispose();
  });

  it("calls onSettled after error", async () => {
    const client = createSuccessClient();
    const onSettled = vi.fn();

    function TestComponent() {
      const { mutate, isError } = useMutation(FailingPort, { onSettled });

      return (
        <div>
          <button onClick={() => mutate({ name: "Fail" })}>Go</button>
          {isError && <span>Failed</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Go"));
    });

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeDefined();
    });

    expect(onSettled).toHaveBeenCalledOnce();
    // onSettled(data, error, input, context) — on error, data is undefined
    expect(onSettled.mock.calls[0][0]).toBeUndefined();
    expect(onSettled.mock.calls[0][1]).toEqual({ _tag: "ApiError", message: "Server error" });
    client.dispose();
  });

  it("calls per-call callbacks alongside hook-level callbacks", async () => {
    const client = createSuccessClient();
    const hookOnSuccess = vi.fn();
    const callOnSuccess = vi.fn();

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, {
        onSuccess: hookOnSuccess,
      });

      return (
        <div>
          <button onClick={() => mutate({ name: "Frank" }, { onSuccess: callOnSuccess })}>
            Create
          </button>
          {isSuccess && <span>Done</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByText("Done")).toBeDefined();
    });

    expect(hookOnSuccess).toHaveBeenCalledOnce();
    expect(callOnSuccess).toHaveBeenCalledOnce();
    client.dispose();
  });
});

// =============================================================================
// Reset
// =============================================================================

describe("useMutation - reset", () => {
  it("resets to idle state after success", async () => {
    const client = createSuccessClient();

    function TestComponent() {
      const { mutate, reset, status } = useMutation(CreateUserPort);

      return (
        <div>
          <span data-testid="status">{status}</span>
          <button onClick={() => mutate({ name: "Grace" })}>Create</button>
          <button onClick={reset}>Reset</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByTestId("status").textContent).toBe("idle");

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("success");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Reset"));
    });

    expect(screen.getByTestId("status").textContent).toBe("idle");
    client.dispose();
  });

  it("clears data and error on reset", async () => {
    const client = createSuccessClient();
    let capturedData: User | undefined;
    let capturedError: unknown;

    function TestComponent() {
      const { mutate, reset, data, error, isIdle } = useMutation(CreateUserPort);
      if (isIdle) {
        capturedData = data;
        capturedError = error;
      }

      return (
        <div>
          <button onClick={() => mutate({ name: "Heidi" })}>Create</button>
          <button onClick={reset}>Reset</button>
          {isIdle && <span>Idle</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.queryByText("Idle")).toBeNull();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Reset"));
    });

    await waitFor(() => {
      expect(screen.getByText("Idle")).toBeDefined();
    });

    expect(capturedData).toBeUndefined();
    expect(capturedError).toBeNull();
    client.dispose();
  });
});

// =============================================================================
// mutateAsync
// =============================================================================

describe("useMutation - mutateAsync", () => {
  it("returns ResultAsync that resolves to Ok on success", async () => {
    const client = createSuccessClient();
    let capturedResult: Result<User, ApiError | QueryResolutionError> | undefined;

    function TestComponent() {
      const { mutateAsync, isSuccess } = useMutation(CreateUserPort);

      const handleClick = async () => {
        capturedResult = await mutateAsync({ name: "Ivan" });
      };

      return (
        <div>
          <button onClick={handleClick}>Create</button>
          {isSuccess && <span>Done</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Create"));
    });

    await waitFor(() => {
      expect(screen.getByText("Done")).toBeDefined();
    });

    expect(capturedResult).toBeDefined();
    expect(capturedResult!.isOk()).toBe(true);
    if (capturedResult!.isOk()) {
      expect(capturedResult!.value).toEqual({ id: "new-1", name: "Ivan" });
    }
    client.dispose();
  });

  it("returns ResultAsync that resolves to Err on failure", async () => {
    const client = createSuccessClient();
    let capturedResult: Result<User, ApiError | QueryResolutionError> | undefined;

    function TestComponent() {
      const { mutateAsync, isError } = useMutation(FailingPort);

      const handleClick = async () => {
        capturedResult = await mutateAsync({ name: "Fail" });
      };

      return (
        <div>
          <button onClick={handleClick}>Go</button>
          {isError && <span>Failed</span>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Go"));
    });

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeDefined();
    });

    expect(capturedResult).toBeDefined();
    expect(capturedResult!.isErr()).toBe(true);
    client.dispose();
  });
});
