import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { ResultAsync, ok, err } from "@hex-di/result";
import { createMutationPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useMutation } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Ports
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
  name: "MutMutCreate",
});

const FailingPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "MutMutFailing",
});

// =============================================================================
// Helpers
// =============================================================================

function createSuccessClient(): QueryClient {
  const container = createTestContainer();
  container.register(CreateUserPort, (input: CreateUserInput) =>
    ResultAsync.ok({ id: "new-1", name: input.name })
  );
  container.register(FailingPort, () => ResultAsync.err({ _tag: "ApiError", message: "fail" }));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Callback execution
// =============================================================================

describe("useMutation callbacks (mutation killers)", () => {
  it("calls onSuccess from options and per-call", async () => {
    const client = createSuccessClient();
    const optionsOnSuccess = vi.fn();
    const callOnSuccess = vi.fn();

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, {
        onSuccess: optionsOnSuccess,
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" }, { onSuccess: callOnSuccess })}>
            Go
          </button>
          <span>Success: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));

    await waitFor(() => expect(screen.getByText("Success: true")).toBeDefined());
    expect(optionsOnSuccess).toHaveBeenCalledOnce();
    expect(callOnSuccess).toHaveBeenCalledOnce();

    client.dispose();
  });

  it("calls onError from options and per-call on failure", async () => {
    const client = createSuccessClient();
    const optionsOnError = vi.fn();
    const callOnError = vi.fn();

    function TestComponent() {
      const { mutate, isError } = useMutation(FailingPort, {
        onError: optionsOnError,
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" }, { onError: callOnError })}>Go</button>
          <span>Error: {String(isError)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));

    await waitFor(() => expect(screen.getByText("Error: true")).toBeDefined());
    expect(optionsOnError).toHaveBeenCalledOnce();
    expect(callOnError).toHaveBeenCalledOnce();

    client.dispose();
  });

  it("calls onSettled for both success and error", async () => {
    const client = createSuccessClient();
    const optionsOnSettled = vi.fn();
    const callOnSettled = vi.fn();

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, {
        onSettled: optionsOnSettled,
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Bob" }, { onSettled: callOnSettled })}>Go</button>
          <span>Done: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));

    await waitFor(() => expect(screen.getByText("Done: true")).toBeDefined());
    expect(optionsOnSettled).toHaveBeenCalledOnce();
    expect(callOnSettled).toHaveBeenCalledOnce();

    client.dispose();
  });

  it("onSettled receives null error on success", async () => {
    const client = createSuccessClient();
    let settledError: unknown = "not-called";

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, {
        onSettled: (_data, error) => {
          settledError = error;
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Done: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));

    await waitFor(() => expect(screen.getByText("Done: true")).toBeDefined());
    expect(settledError).toBeNull();

    client.dispose();
  });
});

// =============================================================================
// safeCall
// =============================================================================

describe("useMutation safeCall (mutation killers)", () => {
  it("swallows callback exceptions without breaking mutation", async () => {
    const client = createSuccessClient();

    function TestComponent() {
      const { mutate, isSuccess, data } = useMutation(CreateUserPort, {
        onSuccess: () => {
          throw new Error("callback crash");
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Success: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));

    await waitFor(() => expect(screen.getByText("Success: true")).toBeDefined());

    client.dispose();
  });
});

// =============================================================================
// State transitions
// =============================================================================

describe("useMutation state transitions (mutation killers)", () => {
  it("transitions idle -> pending -> success", async () => {
    const client = createSuccessClient();
    const statuses: string[] = [];

    function TestComponent() {
      const { mutate, status } = useMutation(CreateUserPort);
      statuses.push(status);
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Status: {status}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Status: idle")).toBeDefined();

    await act(async () => fireEvent.click(screen.getByText("Go")));

    await waitFor(() => expect(screen.getByText("Status: success")).toBeDefined());
    expect(statuses).toContain("idle");
    expect(statuses).toContain("success");

    client.dispose();
  });

  it("transitions idle -> pending -> error", async () => {
    const client = createSuccessClient();

    function TestComponent() {
      const { mutate, status } = useMutation(FailingPort);
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Status: {status}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Status: idle")).toBeDefined();

    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Status: error")).toBeDefined());

    client.dispose();
  });
});

// =============================================================================
// onMutate context
// =============================================================================

describe("useMutation onMutate (mutation killers)", () => {
  it("passes context from onMutate to onSuccess", async () => {
    const client = createSuccessClient();
    let receivedContext: unknown = "not-set";

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, {
        onMutate: () => ({ optimistic: true }),
        onSuccess: (_data, _input, context) => {
          receivedContext = context;
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Done: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Done: true")).toBeDefined());

    expect(receivedContext).toEqual({ optimistic: true });

    client.dispose();
  });

  it("continues without context when onMutate throws", async () => {
    const client = createSuccessClient();
    let receivedContext: unknown = "not-set";

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, {
        onMutate: async () => {
          throw new Error("onMutate crash");
        },
        onSuccess: (_data, _input, context) => {
          receivedContext = context;
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Done: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Done: true")).toBeDefined());

    // Context should be undefined since onMutate threw
    expect(receivedContext).toBeUndefined();

    client.dispose();
  });
});

// =============================================================================
// reset
// =============================================================================

describe("useMutation reset (mutation killers)", () => {
  it("reset returns to idle state", async () => {
    const client = createSuccessClient();

    function TestComponent() {
      const { mutate, reset, status } = useMutation(CreateUserPort);
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <button onClick={reset}>Reset</button>
          <span>Status: {status}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Status: success")).toBeDefined());

    await act(async () => fireEvent.click(screen.getByText("Reset")));
    expect(screen.getByText("Status: idle")).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// result field
// =============================================================================

describe("useMutation result field (mutation killers)", () => {
  it("result is undefined when idle", () => {
    const client = createSuccessClient();
    let capturedResult: unknown = "not-set";

    function TestComponent() {
      const mutation = useMutation(CreateUserPort);
      capturedResult = mutation.result;
      return <div>Idle</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(capturedResult).toBeUndefined();
    client.dispose();
  });

  it("result contains Ok on success", async () => {
    const client = createSuccessClient();
    let capturedResult: any;

    function TestComponent() {
      const { mutate, result, isSuccess } = useMutation(CreateUserPort);
      capturedResult = result;
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Done: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Done: true")).toBeDefined());

    expect(capturedResult).toBeDefined();
    expect(capturedResult._tag).toBe("Ok");

    client.dispose();
  });

  it("variables tracks the input", async () => {
    const client = createSuccessClient();
    let capturedVars: any;

    function TestComponent() {
      const { mutate, variables, isSuccess } = useMutation(CreateUserPort);
      capturedVars = variables;
      return (
        <div>
          <button onClick={() => mutate({ name: "Charlie" })}>Go</button>
          <span>Done: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(capturedVars).toBeUndefined();

    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Done: true")).toBeDefined());

    expect(capturedVars).toEqual({ name: "Charlie" });

    client.dispose();
  });
});

// =============================================================================
// Scope queuing
// =============================================================================

describe("useMutation scope queuing (mutation killers)", () => {
  it("serializes mutations with the same scope ID", async () => {
    const executionOrder: string[] = [];
    const container = createTestContainer();
    container.register(CreateUserPort, (input: CreateUserInput) => {
      executionOrder.push(`start-${input.name}`);
      return ResultAsync.fromSafePromise(
        new Promise<User>(resolve =>
          setTimeout(() => {
            executionOrder.push(`end-${input.name}`);
            resolve({ id: "1", name: input.name });
          }, 10)
        )
      );
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { mutate, isIdle } = useMutation(CreateUserPort, {
        scope: { id: "test-scope" },
      });
      return (
        <div>
          <button
            onClick={() => {
              mutate({ name: "A" });
              mutate({ name: "B" });
            }}
          >
            Go
          </button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));

    // Wait for both mutations to complete
    await waitFor(
      () => {
        expect(executionOrder).toContain("end-A");
        expect(executionOrder).toContain("end-B");
      },
      { timeout: 5000 }
    );

    // With scope queuing, A should start before B
    expect(executionOrder.indexOf("start-A")).toBeLessThan(executionOrder.indexOf("start-B"));

    client.dispose();
  });

  it("mutations without scope run concurrently", async () => {
    const executionOrder: string[] = [];
    const container = createTestContainer();
    container.register(CreateUserPort, (input: CreateUserInput) => {
      executionOrder.push(`start-${input.name}`);
      return ResultAsync.fromSafePromise(
        new Promise<User>(resolve =>
          setTimeout(() => {
            executionOrder.push(`end-${input.name}`);
            resolve({ id: "1", name: input.name });
          }, 10)
        )
      );
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      // No scope option
      const { mutate } = useMutation(CreateUserPort);
      return (
        <div>
          <button
            onClick={() => {
              mutate({ name: "X" });
              mutate({ name: "Y" });
            }}
          >
            Go
          </button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));

    await waitFor(
      () => {
        expect(executionOrder).toContain("end-X");
        expect(executionOrder).toContain("end-Y");
      },
      { timeout: 5000 }
    );

    // Without scope, both should start immediately
    expect(executionOrder.indexOf("start-X")).toBeLessThan(executionOrder.indexOf("end-X"));
    expect(executionOrder.indexOf("start-Y")).toBeLessThan(executionOrder.indexOf("end-Y"));

    client.dispose();
  });
});

// =============================================================================
// isPending computed
// =============================================================================

describe("useMutation isPending (mutation killers)", () => {
  it("isPending is true during mutation execution", async () => {
    let resolvePromise: ((v: User) => void) | undefined;
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User>(resolve => {
          resolvePromise = resolve;
        })
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const statusHistory: string[] = [];
    const pendingHistory: boolean[] = [];

    function TestComponent() {
      const { mutate, status, isPending } = useMutation(CreateUserPort);
      statusHistory.push(status);
      pendingHistory.push(isPending);
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Status: {status}</span>
          <span>Pending: {String(isPending)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Status: idle")).toBeDefined();
    expect(screen.getByText("Pending: false")).toBeDefined();

    await act(async () => fireEvent.click(screen.getByText("Go")));

    // Should be pending now
    await waitFor(() => expect(screen.getByText("Status: pending")).toBeDefined());
    expect(screen.getByText("Pending: true")).toBeDefined();

    // Resolve the mutation
    await act(async () => {
      resolvePromise?.({ id: "1", name: "Alice" });
    });

    await waitFor(() => expect(screen.getByText("Status: success")).toBeDefined());
    expect(screen.getByText("Pending: false")).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// Per-call onSettled on error path
// =============================================================================

// =============================================================================
// State field values
// =============================================================================

describe("useMutation state field values (mutation killers)", () => {
  it("idle state has correct field values", () => {
    const client = createSuccessClient();
    let capturedState: any;

    function TestComponent() {
      const state = useMutation(CreateUserPort);
      capturedState = state;
      return <div>Status: {state.status}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(capturedState.status).toBe("idle");
    expect(capturedState.isPending).toBe(false);
    expect(capturedState.isSuccess).toBe(false);
    expect(capturedState.isError).toBe(false);
    expect(capturedState.isIdle).toBe(true);
    expect(capturedState.data).toBeUndefined();
    expect(capturedState.error).toBeNull();
    expect(capturedState.result).toBeUndefined();
    expect(capturedState.variables).toBeUndefined();
    expect(capturedState.context).toBeUndefined();

    client.dispose();
  });

  it("success state has correct field values", async () => {
    const client = createSuccessClient();
    let capturedState: any;

    function TestComponent() {
      const state = useMutation(CreateUserPort);
      capturedState = state;
      return (
        <div>
          <button onClick={() => state.mutate({ name: "Alice" })}>Go</button>
          <span>Status: {state.status}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Status: success")).toBeDefined());

    expect(capturedState.status).toBe("success");
    expect(capturedState.isPending).toBe(false);
    expect(capturedState.isSuccess).toBe(true);
    expect(capturedState.isError).toBe(false);
    expect(capturedState.isIdle).toBe(false);
    expect(capturedState.data).toBeDefined();
    expect(capturedState.error).toBeNull();
    expect(capturedState.variables).toEqual({ name: "Alice" });

    client.dispose();
  });

  it("error state has correct field values", async () => {
    const client = createSuccessClient();
    let capturedState: any;

    function TestComponent() {
      const state = useMutation(FailingPort);
      capturedState = state;
      return (
        <div>
          <button onClick={() => state.mutate({ name: "Alice" })}>Go</button>
          <span>Status: {state.status}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Status: error")).toBeDefined());

    expect(capturedState.status).toBe("error");
    expect(capturedState.isPending).toBe(false);
    expect(capturedState.isSuccess).toBe(false);
    expect(capturedState.isError).toBe(true);
    expect(capturedState.isIdle).toBe(false);
    expect(capturedState.data).toBeUndefined();
    expect(capturedState.error).not.toBeNull();
    expect(capturedState.result).toBeUndefined();
    expect(capturedState.variables).toEqual({ name: "Alice" });

    client.dispose();
  });

  it("reset clears all fields to idle state", async () => {
    const client = createSuccessClient();
    let capturedState: any;

    function TestComponent() {
      const state = useMutation(CreateUserPort);
      capturedState = state;
      return (
        <div>
          <button onClick={() => state.mutate({ name: "Alice" })}>Go</button>
          <button onClick={state.reset}>Reset</button>
          <span>Status: {state.status}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Status: success")).toBeDefined());

    await act(async () => fireEvent.click(screen.getByText("Reset")));

    expect(capturedState.status).toBe("idle");
    expect(capturedState.data).toBeUndefined();
    expect(capturedState.error).toBeNull();
    expect(capturedState.variables).toBeUndefined();
    expect(capturedState.context).toBeUndefined();
    expect(capturedState.result).toBeUndefined();

    client.dispose();
  });

  it("onSuccess receives data, input, and context", async () => {
    const client = createSuccessClient();
    let receivedData: unknown;
    let receivedInput: unknown;

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, {
        onSuccess: (data, input) => {
          receivedData = data;
          receivedInput = input;
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Bob" })}>Go</button>
          <span>Done: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Done: true")).toBeDefined());

    expect(receivedData).toEqual({ id: "new-1", name: "Bob" });
    expect(receivedInput).toEqual({ name: "Bob" });

    client.dispose();
  });

  it("onError receives error and input", async () => {
    const client = createSuccessClient();
    let receivedError: unknown;
    let receivedInput: unknown;

    function TestComponent() {
      const { mutate, isError } = useMutation(FailingPort, {
        onError: (error, input) => {
          receivedError = error;
          receivedInput = input;
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Eve" })}>Go</button>
          <span>Errored: {String(isError)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Errored: true")).toBeDefined());

    expect(receivedError).toBeDefined();
    expect(receivedInput).toEqual({ name: "Eve" });

    client.dispose();
  });

  it("error state: context from onMutate is preserved", async () => {
    const client = createSuccessClient();
    let receivedContext: unknown = "not-called";

    function TestComponent() {
      const { mutate, isError } = useMutation(FailingPort, {
        onMutate: () => ({ rollback: true }),
        onError: (_error, _input, context) => {
          receivedContext = context;
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Errored: {String(isError)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Errored: true")).toBeDefined());

    expect(receivedContext).toEqual({ rollback: true });

    client.dispose();
  });

  it("pending state sets error to null and variables to input", async () => {
    let resolvePromise: ((v: User) => void) | undefined;
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User>(resolve => {
          resolvePromise = resolve;
        })
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    let capturedState: any;
    function TestComponent() {
      const state = useMutation(CreateUserPort);
      capturedState = state;
      return (
        <div>
          <button onClick={() => state.mutate({ name: "Zoe" })}>Go</button>
          <span>Status: {state.status}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Status: pending")).toBeDefined());

    expect(capturedState.error).toBeNull();
    expect(capturedState.variables).toEqual({ name: "Zoe" });

    // Resolve
    await act(async () => {
      resolvePromise?.({ id: "1", name: "Zoe" });
    });
    client.dispose();
  });

  it("onSettled receives data and null error on success", async () => {
    const client = createSuccessClient();
    let settledData: unknown = "not-called";
    let settledError: unknown = "not-called";
    let settledInput: unknown = "not-called";

    function TestComponent() {
      const { mutate, isSuccess } = useMutation(CreateUserPort, {
        onSettled: (data, error, input) => {
          settledData = data;
          settledError = error;
          settledInput = input;
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Done: {String(isSuccess)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Done: true")).toBeDefined());

    expect(settledData).toEqual({ id: "new-1", name: "Alice" });
    expect(settledError).toBeNull();
    expect(settledInput).toEqual({ name: "Alice" });

    client.dispose();
  });

  it("onSettled receives undefined data and error on failure", async () => {
    const client = createSuccessClient();
    let settledData: unknown = "not-called";
    let settledError: unknown = "not-called";

    function TestComponent() {
      const { mutate, isError } = useMutation(FailingPort, {
        onSettled: (data, error) => {
          settledData = data;
          settledError = error;
        },
      });
      return (
        <div>
          <button onClick={() => mutate({ name: "Alice" })}>Go</button>
          <span>Error: {String(isError)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Error: true")).toBeDefined());

    expect(settledData).toBeUndefined();
    expect(settledError).not.toBeNull();

    client.dispose();
  });
});

// =============================================================================
// Per-call onSettled on error path
// =============================================================================

describe("useMutation per-call onSettled on error (mutation killers)", () => {
  it("calls per-call onSettled with error and undefined data", async () => {
    const client = createSuccessClient();
    let settledData: unknown = "not-called";
    let settledError: unknown = "not-called";

    function TestComponent() {
      const { mutate, isError } = useMutation(FailingPort);
      return (
        <div>
          <button
            onClick={() =>
              mutate(
                { name: "Alice" },
                {
                  onSettled: (data, error) => {
                    settledData = data;
                    settledError = error;
                  },
                }
              )
            }
          >
            Go
          </button>
          <span>Error: {String(isError)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await act(async () => fireEvent.click(screen.getByText("Go")));
    await waitFor(() => expect(screen.getByText("Error: true")).toBeDefined());

    expect(settledData).toBeUndefined();
    expect(settledError).not.toBeNull();

    client.dispose();
  });
});
