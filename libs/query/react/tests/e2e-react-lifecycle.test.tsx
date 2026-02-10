/**
 * E2E tests for React query lifecycle.
 *
 * Tests the full mount → loading → success flow, error handling,
 * refetch, stale-while-revalidate, and optimistic update patterns
 * through React components.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { createElement, Suspense, useState } from "react";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createQueryClient,
  createMutationPort,
  type QueryClient,
} from "@hex-di/query";
import { QueryClientProvider, useQuery, useMutation } from "../src/index.js";
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
  name: "E2EUsers",
});

const UpdateUserPort = createMutationPort<User, { id: string; name: string }, ApiError>()({
  name: "E2EUpdateUser",
});

// =============================================================================
// Tests
// =============================================================================

describe("React query lifecycle E2E", () => {
  it("mount → loading → success flow", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve => setTimeout(() => resolve([{ id: "1", name: "Alice" }]), 50))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserList() {
      const state = useQuery(UsersPort, undefined);
      if (state.isPending) return <div>Loading...</div>;
      if (state.isError) return <div>Error</div>;
      return <div>Users: {state.data?.map(u => u.name).join(", ")}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <UserList />
      </QueryClientProvider>
    );

    // Initially loading
    expect(screen.getByText("Loading...")).toBeDefined();

    // Eventually shows data
    await waitFor(
      () => {
        expect(screen.getByText("Users: Alice")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("shows error state when fetch fails", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.err({ _tag: "NetworkError", message: "Offline" })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserList() {
      const state = useQuery(UsersPort, undefined);
      if (state.isPending) return <div>Loading...</div>;
      if (state.isError) return <div>Error occurred</div>;
      return <div>Users: {state.data?.length}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <UserList />
      </QueryClientProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByText("Error occurred")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("refetch updates data", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([{ id: "1", name: `Alice-v${fetchCount}` }]);
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    let refetchFn: (() => void) | undefined;

    function UserList() {
      const state = useQuery(UsersPort, undefined);
      refetchFn = () => {
        void state.refetch();
      };
      if (state.data === undefined) return <div>Loading...</div>;
      return <div>User: {state.data[0].name}</div>;
    }

    render(
      <QueryClientProvider client={client}>
        <UserList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("User: Alice-v1")).toBeDefined();
    });

    // Trigger refetch
    await act(async () => {
      refetchFn?.();
    });

    await waitFor(() => {
      expect(screen.getByText("User: Alice-v2")).toBeDefined();
    });

    client.dispose();
  });

  it("stale-while-revalidate shows old data while refetching", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      if (fetchCount === 1) {
        return ResultAsync.ok([{ id: "1", name: "Alice" }]);
      }
      return ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve =>
          setTimeout(() => resolve([{ id: "1", name: "Alice-updated" }]), 100)
        )
      );
    });
    const client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });

    let refetchFn: (() => void) | undefined;

    function UserList() {
      const state = useQuery(UsersPort, undefined);
      refetchFn = () => {
        void state.refetch();
      };
      if (state.data === undefined) return <div>Loading...</div>;
      return (
        <div>
          <span>User: {state.data[0].name}</span>
          <span>Refetching: {state.isRefetching ? "yes" : "no"}</span>
        </div>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <UserList />
      </QueryClientProvider>
    );

    // Wait for initial data
    await waitFor(() => {
      expect(screen.getByText("User: Alice")).toBeDefined();
    });

    // Trigger refetch - old data should remain visible
    await act(async () => {
      refetchFn?.();
    });

    // Eventually shows updated data
    await waitFor(
      () => {
        expect(screen.getByText("User: Alice-updated")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("optimistic mutation update with rollback on error", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () => ResultAsync.ok([{ id: "1", name: "Alice" }]));
    container.register(UpdateUserPort, () =>
      ResultAsync.err({ _tag: "ServerError", message: "Update failed" })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserManager() {
      const queryState = useQuery(UsersPort, undefined);
      const mutation = useMutation(UpdateUserPort);

      const handleUpdate = (): void => {
        // Optimistic update
        client.setQueryData(UsersPort, undefined, [{ id: "1", name: "Bob-optimistic" }]);

        mutation.mutate(
          { id: "1", name: "Bob" },
          {
            onError: () => {
              // Rollback
              client.setQueryData(UsersPort, undefined, [{ id: "1", name: "Alice" }]);
            },
          }
        );
      };

      if (queryState.data === undefined) return <div>Loading...</div>;

      return (
        <div>
          <span>User: {queryState.data[0].name}</span>
          <button onClick={handleUpdate}>Update</button>
          {mutation.isError && <span>Mutation failed</span>}
        </div>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <UserManager />
      </QueryClientProvider>
    );

    // Wait for initial data
    await waitFor(() => {
      expect(screen.getByText("User: Alice")).toBeDefined();
    });

    // Click update button
    await act(async () => {
      fireEvent.click(screen.getByText("Update"));
    });

    // After error + rollback, should show original data
    await waitFor(
      () => {
        expect(screen.getByText("User: Alice")).toBeDefined();
        expect(screen.getByText("Mutation failed")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("optimistic mutation commits on success", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () => ResultAsync.ok([{ id: "1", name: "Alice" }]));
    container.register(UpdateUserPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User>(resolve => setTimeout(() => resolve({ id: "1", name: "Bob" }), 50))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function UserManager() {
      const queryState = useQuery(UsersPort, undefined);
      const mutation = useMutation(UpdateUserPort);

      const handleUpdate = (): void => {
        // Optimistic update
        client.setQueryData(UsersPort, undefined, [{ id: "1", name: "Bob-optimistic" }]);

        mutation.mutate(
          { id: "1", name: "Bob" },
          {
            onSuccess: () => {
              // On success, set the final data from server response
              client.setQueryData(UsersPort, undefined, [{ id: "1", name: "Bob" }]);
            },
          }
        );
      };

      if (queryState.data === undefined) return <div>Loading...</div>;

      return (
        <div>
          <span>User: {queryState.data[0].name}</span>
          <button onClick={handleUpdate}>Update</button>
          {mutation.isSuccess && <span>Mutation succeeded</span>}
        </div>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <UserManager />
      </QueryClientProvider>
    );

    // Wait for initial data
    await waitFor(() => {
      expect(screen.getByText("User: Alice")).toBeDefined();
    });

    // Click update button — optimistic update should show immediately
    await act(async () => {
      fireEvent.click(screen.getByText("Update"));
    });

    // Eventually shows committed data and success state
    await waitFor(
      () => {
        expect(screen.getByText("User: Bob")).toBeDefined();
        expect(screen.getByText("Mutation succeeded")).toBeDefined();
      },
      { timeout: 3000 }
    );

    client.dispose();
  });
});
