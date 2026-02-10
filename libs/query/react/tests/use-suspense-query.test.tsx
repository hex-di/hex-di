import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { createElement, Suspense, Component, type ReactNode } from "react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useSuspenseQuery } from "../src/index.js";
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

const UsersPort = createQueryPort<User[], void, ApiError>()({
  name: "SuspenseUsers",
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
// Helpers
// =============================================================================

function createSuccessClient(): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.ok([{ id: "1", name: "Alice" }]));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function createErrorClient(): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () =>
    ResultAsync.err({ _tag: "NetworkError", message: "Connection failed" })
  );
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Tests
// =============================================================================

describe("useSuspenseQuery", () => {
  it("shows suspense fallback while loading", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve => setTimeout(() => resolve([{ id: "1", name: "Alice" }]), 200))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserList() {
      const { data } = useSuspenseQuery(UsersPort, undefined);
      return <div>Users: {data.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Suspense Loading...</div>}>
          <UserList />
        </Suspense>
      </Wrapper>
    );

    // Should show suspense fallback initially
    expect(screen.getByText("Suspense Loading...")).toBeDefined();

    // Should resolve to data
    await waitFor(
      () => {
        expect(screen.getByText("Users: 1")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("resolves immediately when data is cached", async () => {
    const client = createSuccessClient();

    // Pre-populate cache
    await client.prefetchQuery(UsersPort, undefined);

    function UserList() {
      const { data, status } = useSuspenseQuery(UsersPort, undefined);
      return (
        <div>
          <span>Status: {status}</span>
          <span>Users: {data.length}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Loading...</div>}>
          <UserList />
        </Suspense>
      </Wrapper>
    );

    // Data should be available immediately (no suspense fallback)
    await waitFor(() => {
      expect(screen.getByText("Status: success")).toBeDefined();
      expect(screen.getByText("Users: 1")).toBeDefined();
    });

    client.dispose();
  });

  it("throws error for ErrorBoundary", async () => {
    const client = createErrorClient();

    function UserList() {
      const { data } = useSuspenseQuery(UsersPort, undefined);
      return <div>Users: {data.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestErrorBoundary
          fallback={(error: unknown) => {
            // The error may be wrapped in QueryFetchFailed with .cause
            const err = error as Record<string, unknown>;
            const tag = (err._tag ?? err.message ?? "unknown") as string;
            return <div>Error caught: {tag}</div>;
          }}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <UserList />
          </Suspense>
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

  it("returns success state shape", async () => {
    const client = createSuccessClient();
    await client.prefetchQuery(UsersPort, undefined);

    let capturedState: { status: string; isSuccess: boolean } | undefined;

    function UserList() {
      const state = useSuspenseQuery(UsersPort, undefined);
      capturedState = { status: state.status, isSuccess: state.isSuccess };
      return <div>OK</div>;
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Loading...</div>}>
          <UserList />
        </Suspense>
      </Wrapper>
    );

    await waitFor(() => {
      expect(capturedState).toBeDefined();
      expect(capturedState?.status).toBe("success");
      expect(capturedState?.isSuccess).toBe(true);
    });

    client.dispose();
  });

  it("data is non-optional in success state", async () => {
    const client = createSuccessClient();
    await client.prefetchQuery(UsersPort, undefined);

    let dataLength = -1;

    function UserList() {
      const { data } = useSuspenseQuery(UsersPort, undefined);
      // data is TData (not TData | undefined) in SuspenseQueryState
      dataLength = data.length;
      return <div>Length: {data.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Loading...</div>}>
          <UserList />
        </Suspense>
      </Wrapper>
    );

    await waitFor(() => {
      expect(dataLength).toBe(1);
      expect(screen.getByText("Length: 1")).toBeDefined();
    });

    client.dispose();
  });

  it("has isFetching and isRefetching fields", async () => {
    const client = createSuccessClient();
    await client.prefetchQuery(UsersPort, undefined);

    let capturedFetching: boolean | undefined;
    let capturedRefetching: boolean | undefined;

    function UserList() {
      const { isFetching, isRefetching } = useSuspenseQuery(UsersPort, undefined);
      capturedFetching = isFetching;
      capturedRefetching = isRefetching;
      return <div>OK</div>;
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Loading...</div>}>
          <UserList />
        </Suspense>
      </Wrapper>
    );

    await waitFor(() => {
      expect(capturedFetching).toBe(false);
      expect(capturedRefetching).toBe(false);
    });

    client.dispose();
  });
});
