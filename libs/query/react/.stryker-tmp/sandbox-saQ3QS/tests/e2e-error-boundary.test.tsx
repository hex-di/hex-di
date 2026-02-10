/**
 * E2E tests for error boundary integration.
 *
 * Tests throwOnError option, fallback UI rendering, and
 * recovery after error.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { createElement, Component, type ReactNode, useState } from "react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useQuery } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Ports
// =============================================================================

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<string[], void, ApiError>()({
  name: "E2EErrorBoundaryUsers",
});

// =============================================================================
// Error Boundary Component
// =============================================================================

interface ErrorBoundaryState {
  error: unknown;
}

class TestErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: unknown, reset: () => void) => ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error !== null) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("Error boundary E2E", () => {
  it("throwOnError sends error to ErrorBoundary", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.err({ _tag: "ServerError", message: "Internal error" })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserList() {
      const state = useQuery(UsersPort, undefined, { throwOnError: true });
      if (state.isPending) return <div>Loading...</div>;
      return <div>Users: {state.data?.length}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <TestErrorBoundary
          fallback={error => {
            const err = error as Record<string, unknown>;
            return <div>Caught: {String(err._tag ?? "unknown")}</div>;
          }}
        >
          <UserList />
        </TestErrorBoundary>
      </QueryClientProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByText("Caught: QueryFetchFailed")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("shows fallback UI when error is thrown", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.err({ _tag: "NotFound", message: "Not found" })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserList() {
      const state = useQuery(UsersPort, undefined, { throwOnError: true });
      if (state.isPending) return <div>Loading...</div>;
      return <div>Users loaded</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <TestErrorBoundary
          fallback={() => (
            <div>
              <span>Something went wrong</span>
              <span>Please try again later</span>
            </div>
          )}
        >
          <UserList />
        </TestErrorBoundary>
      </QueryClientProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByText("Something went wrong")).toBeDefined();
        expect(screen.getByText("Please try again later")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("retries query after error boundary reset", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      if (fetchCount === 1) {
        return ResultAsync.err({ _tag: "ServerError", message: "First attempt fails" });
      }
      return ResultAsync.ok(["Alice", "Bob"]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    function UserList() {
      const state = useQuery(UsersPort, undefined, { throwOnError: true });
      if (state.isPending) return <div>Loading...</div>;
      return <div>Users: {state.data?.join(", ")}</div>;
    }

    function App() {
      return (
        <QueryClientProvider client={client}>
          <TestErrorBoundary
            fallback={(_error, reset) => (
              <div>
                <span>Error caught</span>
                <button
                  onClick={() => {
                    // Reset the query before resetting the boundary
                    client.reset(UsersPort);
                    reset();
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          >
            <UserList />
          </TestErrorBoundary>
        </QueryClientProvider>
      );
    }

    render(<App />);

    // First fetch fails → error boundary catches
    await waitFor(
      () => {
        expect(screen.getByText("Error caught")).toBeDefined();
      },
      { timeout: 3000 }
    );

    // Click retry → boundary resets → second fetch succeeds
    await act(async () => {
      fireEvent.click(screen.getByText("Retry"));
    });

    await waitFor(
      () => {
        expect(screen.getByText("Users: Alice, Bob")).toBeDefined();
      },
      { timeout: 3000 }
    );

    expect(fetchCount).toBe(2);
    client.dispose();
  });

  it("conditional throwOnError based on error type", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.err({ _tag: "ValidationError", message: "Bad input" })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserList() {
      const state = useQuery(UsersPort, undefined, {
        // Only throw for ServerError, not ValidationError
        throwOnError: error => error._tag === "ServerError",
      });
      if (state.isPending) return <div>Loading...</div>;
      if (state.isError) return <div>Handled inline: {state.error?._tag}</div>;
      return <div>Users loaded</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <TestErrorBoundary fallback={() => <div>Error boundary caught it</div>}>
          <UserList />
        </TestErrorBoundary>
      </QueryClientProvider>
    );

    // Should NOT hit error boundary since _tag is QueryFetchFailed (not ServerError)
    await waitFor(
      () => {
        // The error is handled inline, not by the error boundary.
        // The original error is wrapped in QueryFetchFailed by fetchWithRetry,
        // so state.error._tag === "QueryFetchFailed".
        expect(screen.getByText("Handled inline: QueryFetchFailed")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });
});
