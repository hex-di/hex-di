/**
 * E2E tests for React Suspense integration.
 *
 * Tests Suspense fallback display, data resolution after suspend,
 * and error propagation to ErrorBoundary via useSuspenseQuery.
 */

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
// Test Setup
// =============================================================================

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<string[], void, ApiError>()({
  name: "E2ESuspenseUsers",
});

class TestErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: unknown) => ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown): { error: unknown } {
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
// Tests
// =============================================================================

describe("Suspense E2E", () => {
  it("shows Suspense fallback while query is loading", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["Alice", "Bob"]), 150))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserList() {
      const { data } = useSuspenseQuery(UsersPort, undefined);
      return <div>Users: {data.join(", ")}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <Suspense fallback={<div>Suspense Loading...</div>}>
          <UserList />
        </Suspense>
      </QueryClientProvider>
    );

    // Should show Suspense fallback
    expect(screen.getByText("Suspense Loading...")).toBeDefined();

    // Should resolve to data
    await waitFor(
      () => {
        expect(screen.getByText("Users: Alice, Bob")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("data is available after suspense resolves", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () => ResultAsync.ok(["Charlie", "Diana"]));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    // Pre-populate cache so no suspension occurs
    await client.prefetchQuery(UsersPort, undefined);

    function UserList() {
      const { data, status, isSuccess } = useSuspenseQuery(UsersPort, undefined);
      return (
        <div>
          <span>Status: {status}</span>
          <span>Success: {String(isSuccess)}</span>
          <span>Users: {data.join(", ")}</span>
        </div>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <Suspense fallback={<div>Loading...</div>}>
          <UserList />
        </Suspense>
      </QueryClientProvider>
    );

    // Data should be immediately available
    await waitFor(() => {
      expect(screen.getByText("Status: success")).toBeDefined();
      expect(screen.getByText("Success: true")).toBeDefined();
      expect(screen.getByText("Users: Charlie, Diana")).toBeDefined();
    });

    client.dispose();
  });

  it("error propagates to ErrorBoundary, not Suspense", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.err({ _tag: "ServerError", message: "Service down" })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserList() {
      const { data } = useSuspenseQuery(UsersPort, undefined);
      return <div>Users: {data.length}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <TestErrorBoundary
          fallback={error => {
            const err = error as Record<string, unknown>;
            return <div>ErrorBoundary: {String(err._tag)}</div>;
          }}
        >
          <Suspense fallback={<div>Suspense fallback</div>}>
            <UserList />
          </Suspense>
        </TestErrorBoundary>
      </QueryClientProvider>
    );

    // Error should reach ErrorBoundary, not stay stuck in Suspense
    await waitFor(
      () => {
        expect(screen.getByText("ErrorBoundary: QueryFetchFailed")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });
});
