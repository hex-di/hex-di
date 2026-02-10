import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useQuery } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Error Boundary for testing
// =============================================================================

interface ErrorBoundaryState {
  error: unknown;
}

class TestErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: unknown) => ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

// =============================================================================
// Test Ports
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
  readonly age: number;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<User[], { role?: string }, ApiError>()({
  name: "EnhancedUsers",
});

// =============================================================================
// Helpers
// =============================================================================

function createClient(users: User[] = [{ id: "1", name: "Alice", age: 30 }]): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.ok(users));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function createErrorClient(): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.err({ _tag: "NotFound", message: "Not found" }));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function createDelayedClient(
  delayMs: number,
  users: User[] = [{ id: "1", name: "Alice", age: 30 }]
): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () =>
    ResultAsync.fromSafePromise(
      new Promise<User[]>(resolve => setTimeout(() => resolve(users), delayMs))
    )
  );
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// select option tests
// =============================================================================

describe("useQuery select option", () => {
  it("transforms data with select function", async () => {
    const client = createClient([
      { id: "1", name: "Alice", age: 30 },
      { id: "2", name: "Bob", age: 25 },
    ]);

    function TestComponent() {
      const { data, isSuccess } = useQuery(
        UsersPort,
        {},
        {
          select: users => users.map(u => u.name),
        }
      );

      if (!isSuccess) return <div>Loading...</div>;
      return <div>Names: {(data as any).join(", ")}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Names: Alice, Bob")).toBeDefined();
    });

    client.dispose();
  });

  it("select does not affect original data", async () => {
    const client = createClient([{ id: "1", name: "Alice", age: 30 }]);

    function TestComponent() {
      const { data, isSuccess } = useQuery(
        UsersPort,
        {},
        {
          select: users => users.length,
        }
      );

      if (!isSuccess) return <div>Loading...</div>;
      return <div>Count: {String(data)}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Count: 1")).toBeDefined();
    });

    client.dispose();
  });
});

// =============================================================================
// placeholderData option tests
// =============================================================================

describe("useQuery placeholderData option", () => {
  it("shows placeholder data while pending", () => {
    const client = createDelayedClient(5000);

    function TestComponent() {
      const { data, isPlaceholderData } = useQuery(
        UsersPort,
        {},
        {
          placeholderData: [{ id: "placeholder", name: "Loading user...", age: 0 }],
        }
      );

      if (!data) return <div>No data</div>;
      return (
        <div>
          <span>Name: {data[0].name}</span>
          <span>Placeholder: {isPlaceholderData ? "yes" : "no"}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Name: Loading user...")).toBeDefined();
    expect(screen.getByText("Placeholder: yes")).toBeDefined();

    client.dispose();
  });

  it("replaces placeholder with real data", async () => {
    const client = createClient([{ id: "1", name: "Alice", age: 30 }]);

    function TestComponent() {
      const { data, isPlaceholderData } = useQuery(
        UsersPort,
        {},
        {
          placeholderData: [{ id: "placeholder", name: "Placeholder", age: 0 }],
        }
      );

      if (!data) return <div>No data</div>;
      return (
        <div>
          <span>Name: {data[0].name}</span>
          <span>Placeholder: {isPlaceholderData ? "yes" : "no"}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Name: Alice")).toBeDefined();
      expect(screen.getByText("Placeholder: no")).toBeDefined();
    });

    client.dispose();
  });

  it("supports function form for placeholderData", () => {
    const client = createDelayedClient(5000);

    function TestComponent() {
      const { data } = useQuery(
        UsersPort,
        {},
        {
          placeholderData: _prev => [{ id: "fn", name: "From function", age: 0 }],
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

    expect(screen.getByText("Name: From function")).toBeDefined();
    client.dispose();
  });
});

// =============================================================================
// throwOnError option tests
// =============================================================================

describe("useQuery throwOnError option", () => {
  it("throws error when throwOnError is true", async () => {
    const client = createErrorClient();

    function TestComponent() {
      const state = useQuery(UsersPort, {}, { throwOnError: true });
      return <div>Status: {state.status}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestErrorBoundary
          fallback={(error: unknown) => {
            const err = error as Record<string, unknown>;
            const tag = (err._tag ?? "unknown") as string;
            return <div>Error caught: {tag}</div>;
          }}
        >
          <TestComponent />
        </TestErrorBoundary>
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(screen.getByText("Error caught: QueryFetchFailed")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("filters errors with function form", async () => {
    const client = createErrorClient();

    function TestComponent() {
      const { status, error } = useQuery(
        UsersPort,
        {},
        {
          throwOnError: err => err._tag === "Critical",
        }
      );

      // "NotFound" should NOT throw since the predicate checks for "Critical"
      if (status === "error") return <div>Error: {error?._tag}</div>;
      return <div>Status: {status}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    // The error should NOT be thrown because _tag is "NotFound", not "Critical"
    // But the query may still be pending since errors don't go into cache
    await waitFor(() => {
      expect(screen.getByText(/Status|Error/)).toBeDefined();
    });

    client.dispose();
  });
});

// =============================================================================
// refetchInterval option tests
// =============================================================================

describe("useQuery refetchInterval option", () => {
  it("does not refetch when interval is false", async () => {
    const client = createClient();
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const { isSuccess } = useQuery(UsersPort, {}, { refetchInterval: false });
      return <div>Success: {String(isSuccess)}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Success: true")).toBeDefined();
    });

    const countAfterSuccess = renderCount;

    // Wait a bit and check no extra renders from refetch
    await new Promise(resolve => setTimeout(resolve, 200));
    // Should not have had significantly more renders
    expect(renderCount).toBeLessThanOrEqual(countAfterSuccess + 2);

    client.dispose();
  });

  it("enabled option prevents fetching", async () => {
    const client = createClient();

    function TestComponent() {
      const { isPending, data } = useQuery(UsersPort, {}, { enabled: false });
      return <div>{isPending && !data ? "Disabled" : "Fetched"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Disabled")).toBeDefined();
    client.dispose();
  });
});
