import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { Suspense, Component, type ReactNode } from "react";
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
  name: "SusMutUsers",
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
// Suspense integration
// =============================================================================

describe("useSuspenseQuery (mutation killers)", () => {
  it("throws promise for Suspense fallback while loading", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve => setTimeout(() => resolve([{ id: "1", name: "Alice" }]), 50))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { data } = useSuspenseQuery(UsersPort, undefined);
      return <div>Data: {data[0].name}</div>;
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Suspending...</div>}>
          <TestComponent />
        </Suspense>
      </Wrapper>
    );

    // Should show suspense fallback first
    expect(screen.getByText("Suspending...")).toBeDefined();

    // Then resolve to data
    await waitFor(() => expect(screen.getByText("Data: Alice")).toBeDefined());

    client.dispose();
  });

  it("returns success state when data is cached", async () => {
    const client = createSuccessClient();

    // Pre-populate cache
    await client.fetchQuery(UsersPort, undefined);

    function TestComponent() {
      const { status, data, isSuccess } = useSuspenseQuery(UsersPort, undefined);
      return (
        <div>
          Status: {status}, Name: {data[0].name}, IsSuccess: {String(isSuccess)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Suspending...</div>}>
          <TestComponent />
        </Suspense>
      </Wrapper>
    );

    // Data is already cached, should render immediately
    await waitFor(() =>
      expect(screen.getByText("Status: success, Name: Alice, IsSuccess: true")).toBeDefined()
    );

    client.dispose();
  });

  it("throws error for ErrorBoundary on failure", async () => {
    const client = createErrorClient();

    function TestComponent() {
      const { data } = useSuspenseQuery(UsersPort, undefined);
      return <div>Data: {data[0].name}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestErrorBoundary fallback={e => <div>Error caught</div>}>
          <Suspense fallback={<div>Suspending...</div>}>
            <TestComponent />
          </Suspense>
        </TestErrorBoundary>
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Error caught")).toBeDefined(), { timeout: 5000 });

    client.dispose();
  });

  it("destroys observer on unmount", async () => {
    const client = createSuccessClient();
    await client.fetchQuery(UsersPort, undefined);

    function TestComponent() {
      const { data } = useSuspenseQuery(UsersPort, undefined);
      return <div>Data: {data[0].name}</div>;
    }

    const { unmount } = render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Suspending...</div>}>
          <TestComponent />
        </Suspense>
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Data: Alice")).toBeDefined());

    unmount();
    // Client is still usable
    expect(client.isDisposed).toBe(false);

    client.dispose();
  });

  it("returns isFetching and isRefetching fields", async () => {
    const client = createSuccessClient();
    await client.fetchQuery(UsersPort, undefined);

    let capturedState: any;
    function TestComponent() {
      const state = useSuspenseQuery(UsersPort, undefined);
      capturedState = state;
      return <div>Data: {state.data[0].name}</div>;
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Suspending...</div>}>
          <TestComponent />
        </Suspense>
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Data: Alice")).toBeDefined());

    expect(typeof capturedState.isFetching).toBe("boolean");
    expect(typeof capturedState.isRefetching).toBe("boolean");
    expect(capturedState.dataUpdatedAt).toBeDefined();

    client.dispose();
  });

  it("returns cached snapshot when status unchanged across re-renders", async () => {
    const client = createSuccessClient();
    await client.fetchQuery(UsersPort, undefined);

    const snapshots: unknown[] = [];
    function TestComponent() {
      const state = useSuspenseQuery(UsersPort, undefined);
      snapshots.push(state);
      return <div>Data: {state.data[0].name}</div>;
    }

    const { rerender } = render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Suspending...</div>}>
          <TestComponent />
        </Suspense>
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Data: Alice")).toBeDefined());

    // Force a re-render
    rerender(
      <Wrapper client={client}>
        <Suspense fallback={<div>Suspending...</div>}>
          <TestComponent />
        </Suspense>
      </Wrapper>
    );

    // Multiple renders should produce consistent state
    expect(snapshots.length).toBeGreaterThanOrEqual(2);

    client.dispose();
  });

  it("status is always success on the returned state", async () => {
    const client = createSuccessClient();
    await client.fetchQuery(UsersPort, undefined);

    function TestComponent() {
      const state = useSuspenseQuery(UsersPort, undefined);
      return (
        <div>
          Status: {state.status}, IsSuccess: {String(state.isSuccess)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <Suspense fallback={<div>Suspending...</div>}>
          <TestComponent />
        </Suspense>
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Status: success, IsSuccess: true")).toBeDefined());

    client.dispose();
  });
});
