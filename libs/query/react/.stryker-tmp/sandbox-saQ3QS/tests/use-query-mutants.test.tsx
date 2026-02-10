import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useQuery } from "../src/index.js";
import { createTestContainer, type TestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// =============================================================================
// Error Boundary
// =============================================================================

class TestErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: unknown) => ReactNode },
  { error: unknown }
> {
  state = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    if (this.state.error !== null) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}

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

const UsersPort = createQueryPort<User[], { role?: string }, ApiError>()({
  name: "QMutUsers",
});

const UserByIdPort = createQueryPort<User, { id: string }, ApiError>()({
  name: "QMutUserById",
});

// =============================================================================
// Helpers
// =============================================================================

function createClient(
  users: User[] = [{ id: "1", name: "Alice" }],
  opts?: { delay?: number }
): { client: QueryClient; container: TestContainer } {
  const container = createTestContainer();
  if (opts?.delay) {
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve => setTimeout(() => resolve(users), opts.delay))
      )
    );
  } else {
    container.register(UsersPort, () => ResultAsync.ok(users));
  }
  return {
    container,
    client: createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } }),
  };
}

function createErrorClient(): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.err({ _tag: "NetworkError", message: "fail" }));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// refetchInterval
// =============================================================================

describe("useQuery refetchInterval (mutation killers)", () => {
  it("refetches at specified interval", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: `Fetch-${fetchCount}` }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    function TestComponent() {
      const { data, isSuccess } = useQuery(UsersPort, {}, { refetchInterval: 50 });
      if (!isSuccess || !data) return <div>Loading</div>;
      return <div>Name: {data[0].name}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText(/Name: Fetch/)).toBeDefined());
    const initialCount = fetchCount;

    // Wait for refetch interval to fire
    await waitFor(() => expect(fetchCount).toBeGreaterThan(initialCount), { timeout: 3000 });

    client.dispose();
  });

  it("does not refetch when interval is false", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: "Alice" }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isSuccess } = useQuery(UsersPort, {}, { refetchInterval: false });
      return <div>{isSuccess ? "Done" : "Loading"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());
    const countAfter = fetchCount;

    // Wait a bit and verify no more fetches
    await new Promise(r => setTimeout(r, 200));
    expect(fetchCount).toBe(countAfter);

    client.dispose();
  });

  it("does not refetch when interval is 0", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: "Alice" }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isSuccess } = useQuery(UsersPort, {}, { refetchInterval: 0 });
      return <div>{isSuccess ? "Done" : "Loading"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());
    const countAfter = fetchCount;

    await new Promise(r => setTimeout(r, 200));
    expect(fetchCount).toBe(countAfter);

    client.dispose();
  });

  it("clears interval on unmount", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: "Alice" }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    function TestComponent() {
      useQuery(UsersPort, {}, { refetchInterval: 50 });
      return <div>Active</div>;
    }

    const { unmount } = render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(fetchCount).toBeGreaterThanOrEqual(1));
    const countBeforeUnmount = fetchCount;

    unmount();

    await new Promise(r => setTimeout(r, 200));
    // After unmount, no more fetches should occur
    expect(fetchCount).toBeLessThanOrEqual(countBeforeUnmount + 1);

    client.dispose();
  });

  it("skips refetch when document is hidden and refetchIntervalInBackground is false", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: "Alice" }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    // Simulate hidden document
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });

    function TestComponent() {
      useQuery(UsersPort, {}, { refetchInterval: 50, refetchIntervalInBackground: false });
      return <div>Active</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(fetchCount).toBeGreaterThanOrEqual(1));
    const countAfterInitial = fetchCount;

    await new Promise(r => setTimeout(r, 200));
    // Should not have refetched (timer fires but skips due to hidden)
    expect(fetchCount).toBe(countAfterInitial);

    // Restore
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    client.dispose();
  });

  it("refetches when hidden but refetchIntervalInBackground is true", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: "Alice" }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });

    function TestComponent() {
      useQuery(UsersPort, {}, { refetchInterval: 50, refetchIntervalInBackground: true });
      return <div>Active</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(fetchCount).toBeGreaterThanOrEqual(1));
    const countAfterInitial = fetchCount;

    await waitFor(() => expect(fetchCount).toBeGreaterThan(countAfterInitial), { timeout: 3000 });

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    client.dispose();
  });
});

// =============================================================================
// placeholderData
// =============================================================================

describe("useQuery placeholderData (mutation killers)", () => {
  it("static placeholder shown while pending", () => {
    const container = createTestContainer();
    container.register(
      UsersPort,
      () => ResultAsync.fromSafePromise(new Promise<User[]>(() => {})) // never resolves
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { data, isPlaceholderData } = useQuery(
        UsersPort,
        {},
        {
          placeholderData: [{ id: "ph", name: "Placeholder" }],
        }
      );
      if (!data) return <div>No data</div>;
      return (
        <div>
          Name: {data[0].name}, PH: {String(isPlaceholderData)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Name: Placeholder, PH: true")).toBeDefined();
    client.dispose();
  });

  it("function-based placeholder receives previous data", async () => {
    const { client } = createClient([{ id: "1", name: "Alice" }]);

    let placeholderCalled = false;
    function TestComponent() {
      const { data } = useQuery(
        UsersPort,
        {},
        {
          placeholderData: prev => {
            placeholderCalled = true;
            if (prev) return prev;
            return [{ id: "ph", name: "FnPlaceholder" }];
          },
        }
      );
      if (!data) return <div>No data</div>;
      return <div>Name: {data[0].name}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Name: Alice")).toBeDefined();
    });

    expect(placeholderCalled).toBe(true);
    client.dispose();
  });

  it("isPlaceholderData is false after real data arrives", async () => {
    const { client } = createClient([{ id: "1", name: "Alice" }]);

    function TestComponent() {
      const { data, isPlaceholderData } = useQuery(
        UsersPort,
        {},
        {
          placeholderData: [{ id: "ph", name: "Placeholder" }],
        }
      );
      if (!data) return <div>No data</div>;
      return <div>PH: {String(isPlaceholderData)}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("PH: false")).toBeDefined();
    });

    client.dispose();
  });

  it("placeholder not used when data is already cached", async () => {
    const { client } = createClient([{ id: "1", name: "Alice" }]);

    // Pre-populate cache
    await client.fetchQuery(UsersPort, {});

    function TestComponent() {
      const { data, isPlaceholderData } = useQuery(
        UsersPort,
        {},
        {
          placeholderData: [{ id: "ph", name: "Placeholder" }],
        }
      );
      if (!data) return <div>No data</div>;
      return (
        <div>
          Name: {data[0].name}, PH: {String(isPlaceholderData)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Name: Alice, PH: false")).toBeDefined();
    });

    client.dispose();
  });
});

// =============================================================================
// throwOnError
// =============================================================================

describe("useQuery throwOnError (mutation killers)", () => {
  it("boolean true throws error for ErrorBoundary", async () => {
    const client = createErrorClient();

    function TestComponent() {
      useQuery(UsersPort, {}, { throwOnError: true });
      return <div>Should not render</div>;
    }

    render(
      <Wrapper client={client}>
        <TestErrorBoundary
          fallback={e => <div>Caught: {String((e as any)?._tag ?? "unknown")}</div>}
        >
          <TestComponent />
        </TestErrorBoundary>
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Caught:/)).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("function returning true throws", async () => {
    const client = createErrorClient();

    function TestComponent() {
      useQuery(UsersPort, {}, { throwOnError: () => true });
      return <div>Should not render</div>;
    }

    render(
      <Wrapper client={client}>
        <TestErrorBoundary fallback={() => <div>Caught</div>}>
          <TestComponent />
        </TestErrorBoundary>
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(screen.getByText("Caught")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("function returning false does not throw", async () => {
    const client = createErrorClient();

    function TestComponent() {
      const { status, isError } = useQuery(UsersPort, {}, { throwOnError: () => false });
      return (
        <div>
          Status: {status}, Error: {String(isError)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestErrorBoundary fallback={() => <div>Caught</div>}>
          <TestComponent />
        </TestErrorBoundary>
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Status: error/)).toBeDefined();
      },
      { timeout: 3000 }
    );

    // Error boundary should NOT have caught
    expect(screen.queryByText("Caught")).toBeNull();
    client.dispose();
  });
});

// =============================================================================
// Observer lifecycle
// =============================================================================

describe("useQuery observer lifecycle (mutation killers)", () => {
  it("destroys observer on unmount", async () => {
    const { client } = createClient();

    function TestComponent() {
      const { isSuccess } = useQuery(UsersPort, {});
      return <div>{isSuccess ? "Done" : "Loading"}</div>;
    }

    const { unmount } = render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());

    unmount();
    // Client should still work — the observer is destroyed, not the client
    expect(client.isDisposed).toBe(false);

    client.dispose();
  });

  it("returns pending state when observer is null (before params ready)", () => {
    const container = createTestContainer();
    // Never register the port so observer creation might differ
    container.register(UsersPort, () => ResultAsync.ok([{ id: "1", name: "Alice" }]));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const state = useQuery(UsersPort, {}, { enabled: false });
      return (
        <div>
          Status: {state.status}, Pending: {String(state.isPending)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    // Disabled query should be in pending state
    expect(screen.getByText(/Pending: true/)).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// Param change detection
// =============================================================================

describe("useQuery param change detection (mutation killers)", () => {
  it("recreates observer when params change structurally", async () => {
    const container = createTestContainer();
    container.register(UserByIdPort, (params: { id: string }) =>
      ResultAsync.ok({ id: params.id, name: `User-${params.id}` })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent({ id }: { id: string }) {
      const { data, isSuccess } = useQuery(UserByIdPort, { id });
      if (!isSuccess || !data) return <div>Loading</div>;
      return <div>User: {data.name}</div>;
    }

    const { rerender } = render(
      <Wrapper client={client}>
        <TestComponent id="1" />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("User: User-1")).toBeDefined());

    // Change params
    rerender(
      <Wrapper client={client}>
        <TestComponent id="2" />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("User: User-2")).toBeDefined());

    client.dispose();
  });

  it("does NOT recreate observer for structurally equal params", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: "Alice" }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 60_000 } });

    function TestComponent({ role }: { role?: string }) {
      const { isSuccess } = useQuery(UsersPort, { role });
      return <div>{isSuccess ? "Done" : "Loading"}</div>;
    }

    const { rerender } = render(
      <Wrapper client={client}>
        <TestComponent role="admin" />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());
    const countAfterFirst = fetchCount;

    // Re-render with structurally equal params (new object reference)
    rerender(
      <Wrapper client={client}>
        <TestComponent role="admin" />
      </Wrapper>
    );

    // Should NOT trigger another fetch
    expect(fetchCount).toBe(countAfterFirst);

    client.dispose();
  });
});

// =============================================================================
// Enabled option
// =============================================================================

describe("useQuery enabled option (mutation killers)", () => {
  it("does not fetch when enabled is false", () => {
    let fetched = false;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetched = true;
      return ResultAsync.ok([{ id: "1", name: "Alice" }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isPending } = useQuery(UsersPort, {}, { enabled: false });
      return <div>Pending: {String(isPending)}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Pending: true")).toBeDefined();
    expect(fetched).toBe(false);

    client.dispose();
  });

  it("fetches when enabled is true from the start", async () => {
    const { client } = createClient();

    function TestComponent() {
      const { isSuccess, data } = useQuery(UsersPort, {}, { enabled: true });
      if (!isSuccess || !data) return <div>Pending</div>;
      return <div>Data: {data[0].name}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Data: Alice")).toBeDefined());

    client.dispose();
  });
});

// =============================================================================
// Pending state shape
// =============================================================================

describe("useQuery pending state shape (mutation killers)", () => {
  it("pending state has correct field values", () => {
    const container = createTestContainer();
    container.register(UsersPort, () => ResultAsync.fromSafePromise(new Promise<User[]>(() => {})));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    let capturedState: any;
    function TestComponent() {
      const state = useQuery(UsersPort, {});
      capturedState = state;
      return <div>Status: {state.status}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(capturedState.status).toBe("pending");
    expect(capturedState.data).toBeUndefined();
    expect(capturedState.isSuccess).toBe(false);
    expect(capturedState.isError).toBe(false);
    expect(capturedState.isPending).toBe(true);
    expect(capturedState.isFetching).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// Observer recreation and param tracking
// =============================================================================

describe("useQuery observer destroy on param change (mutation killers)", () => {
  it("destroys old observer when params change structurally", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UserByIdPort, (params: { id: string }) => {
      fetchCount++;
      return ResultAsync.ok({ id: params.id, name: `User-${params.id}` });
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    function TestComponent({ id }: { id: string }) {
      const { data, isSuccess } = useQuery(UserByIdPort, { id });
      if (!isSuccess || !data) return <div>Loading</div>;
      return (
        <div>
          User: {data.name}, Fetches: {fetchCount}
        </div>
      );
    }

    const { rerender } = render(
      <Wrapper client={client}>
        <TestComponent id="1" />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText(/User: User-1/)).toBeDefined());
    const firstFetchCount = fetchCount;

    // Change params - should create new observer
    rerender(
      <Wrapper client={client}>
        <TestComponent id="2" />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText(/User: User-2/)).toBeDefined());
    expect(fetchCount).toBeGreaterThan(firstFetchCount);

    client.dispose();
  });
});

// =============================================================================
// Placeholder data caching
// =============================================================================

describe("useQuery placeholder data caching (mutation killers)", () => {
  it("returns cached placeholder state for referential stability", () => {
    const container = createTestContainer();
    container.register(
      UsersPort,
      () => ResultAsync.fromSafePromise(new Promise<User[]>(() => {})) // never resolves
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const placeholderStates: unknown[] = [];
    function TestComponent() {
      const state = useQuery(
        UsersPort,
        {},
        {
          placeholderData: [{ id: "ph", name: "Placeholder" }],
        }
      );
      placeholderStates.push(state);
      return (
        <div>
          PH: {String(state.isPlaceholderData)}, Data: {state.data ? state.data[0].name : "none"}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("PH: true, Data: Placeholder")).toBeDefined();

    // Multiple renders should get same cached placeholder state
    if (placeholderStates.length >= 2) {
      expect(placeholderStates[placeholderStates.length - 1]).toBe(
        placeholderStates[placeholderStates.length - 2]
      );
    }

    client.dispose();
  });

  it("tracks previous data for function placeholders", async () => {
    const { client } = createClient([{ id: "1", name: "Alice" }]);

    let prevDataArg: unknown = "not-called";
    function TestComponent() {
      const { data } = useQuery(
        UsersPort,
        {},
        {
          placeholderData: prev => {
            prevDataArg = prev;
            return prev ?? [{ id: "ph", name: "FnPH" }];
          },
        }
      );
      if (!data) return <div>No data</div>;
      return <div>Name: {data[0].name}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Name: Alice")).toBeDefined());

    // The placeholder function should have been called at least once
    expect(prevDataArg).not.toBe("not-called");

    client.dispose();
  });
});

// =============================================================================
// refetchInterval edge cases
// =============================================================================

describe("useQuery refetchInterval edge cases (mutation killers)", () => {
  it("does not refetch when interval is undefined", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: "Alice" }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isSuccess } = useQuery(UsersPort, {}, { refetchInterval: undefined });
      return <div>{isSuccess ? "Done" : "Loading"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());
    const countAfter = fetchCount;

    await new Promise(r => setTimeout(r, 200));
    expect(fetchCount).toBe(countAfter);

    client.dispose();
  });
});

// =============================================================================
// Error state
// =============================================================================

describe("useQuery error state (mutation killers)", () => {
  it("isError and error are set on failure", async () => {
    const client = createErrorClient();

    function TestComponent() {
      const { isError, error, status } = useQuery(UsersPort, {});
      return (
        <div>
          Status: {status}, IsError: {String(isError)}, HasError: {String(error !== null)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestErrorBoundary fallback={() => <div>Caught</div>}>
          <TestComponent />
        </TestErrorBoundary>
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText(/IsError: true/)).toBeDefined());
    expect(screen.getByText(/HasError: true/)).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// Success state
// =============================================================================

describe("useQuery success state (mutation killers)", () => {
  it("isSuccess and data are set after successful fetch", async () => {
    const { client } = createClient();

    function TestComponent() {
      const { isSuccess, data, status, isPending, isError } = useQuery(UsersPort, {});
      if (!isSuccess || !data) return <div>Loading</div>;
      return (
        <div>
          Status: {status}, Name: {data[0].name}, Pending: {String(isPending)}, Error:{" "}
          {String(isError)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText(/Status: success/)).toBeDefined());
    expect(screen.getByText(/Pending: false/)).toBeDefined();
    expect(screen.getByText(/Error: false/)).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// Dependency resolution (mapper mode)
// =============================================================================

const ParentPort = createQueryPort<string, void, ApiError>()({
  name: "QMutParent",
});

const ChildPort = createQueryPort<User, { parentId: string }, ApiError>()({
  name: "QMutChild",
  dependsOn: [ParentPort],
});

describe("useQuery dependency resolution (mutation killers)", () => {
  it("resolves params from mapper when dependency data is available", async () => {
    const container = createTestContainer();
    container.register(ParentPort, () => ResultAsync.ok("parent-123"));
    container.register(ChildPort, (params: { parentId: string }) =>
      ResultAsync.ok({ id: "c1", name: `Child-of-${params.parentId}` })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const state = useQuery(ChildPort, deps => ({ parentId: deps.QMutParent }), {
        dependencyParams: { QMutParent: undefined },
      });
      if (!state.isSuccess || !state.data) return <div>Loading</div>;
      return <div>Child: {state.data.name}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Child: Child-of-parent-123")).toBeDefined(), {
      timeout: 5000,
    });

    client.dispose();
  });

  it("shows pending while dependency is loading", async () => {
    const container = createTestContainer();
    // Parent never resolves
    container.register(ParentPort, () =>
      ResultAsync.fromSafePromise(new Promise<string>(() => {}))
    );
    container.register(ChildPort, () => ResultAsync.ok({ id: "c1", name: "child" }));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const state = useQuery(ChildPort, deps => ({ parentId: deps.QMutParent }), {
        dependencyParams: { QMutParent: undefined },
      });
      return (
        <div>
          Status: {state.status}, Pending: {String(state.isPending)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText(/Status: pending/)).toBeDefined();
    expect(screen.getByText(/Pending: true/)).toBeDefined();

    client.dispose();
  });

  it("resolves with empty dependsOn array (non-mapper mode)", async () => {
    const { client } = createClient();

    function TestComponent() {
      const state = useQuery(UsersPort, {});
      if (!state.isSuccess || !state.data) return <div>Loading</div>;
      return <div>Data: {state.data[0].name}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Data: Alice")).toBeDefined());

    client.dispose();
  });
});
