/// <reference lib="dom" />
/**
 * React Test Helpers
 *
 * @vitest-environment jsdom
 *
 * Tests for createQueryTestWrapper and createQueryTestWrapperProps.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { createQueryPort } from "@hex-di/query";
import { ResultAsync } from "@hex-di/result";
import { useQueryClient, useQuery } from "@hex-di/query-react";
import {
  createQueryTestWrapper,
  createQueryTestWrapperProps,
  createQueryTestContainer,
  createMockQueryFetcher,
} from "../src/index.js";

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

const UsersPort = createQueryPort<User[], void, ApiError>()({ name: "ReactHelperUsers" });

// =============================================================================
// createQueryTestWrapper - no config
// =============================================================================

describe("createQueryTestWrapper", () => {
  it("returns a wrapper component that provides a QueryClient", () => {
    const Wrapper = createQueryTestWrapper();
    let captured: ReturnType<typeof useQueryClient> | undefined;

    function TestComponent(): React.ReactNode {
      captured = useQueryClient();
      return <div>test</div>;
    }

    render(<TestComponent />, { wrapper: Wrapper });

    expect(captured).toBeDefined();
    expect(captured?.isDisposed).toBe(false);
  });

  it("works with custom defaults", () => {
    const Wrapper = createQueryTestWrapper({ defaults: { staleTime: 60_000 } });
    let captured: ReturnType<typeof useQueryClient> | undefined;

    function TestComponent(): React.ReactNode {
      captured = useQueryClient();
      return <div>test</div>;
    }

    render(<TestComponent />, { wrapper: Wrapper });

    expect(captured).toBeDefined();
    expect(captured?.defaults.staleTime).toBe(60_000);
  });

  it("accepts a pre-existing QueryClient", () => {
    const container = createQueryTestContainer();
    const Wrapper = createQueryTestWrapper({ queryClient: container.queryClient });
    let captured: ReturnType<typeof useQueryClient> | undefined;

    function TestComponent(): React.ReactNode {
      captured = useQueryClient();
      return <div>test</div>;
    }

    render(<TestComponent />, { wrapper: Wrapper });

    expect(captured).toBe(container.queryClient);

    container.dispose();
  });

  it("integrates with useQuery to render data", async () => {
    const container = createQueryTestContainer({ defaults: { retry: 0 } });
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });
    container.register(UsersPort, fetcher);

    const Wrapper = createQueryTestWrapper({ queryClient: container.queryClient });

    function UserList(): React.ReactNode {
      const { data, isSuccess, isPending } = useQuery(UsersPort, undefined);

      if (isPending) return <div>Loading...</div>;
      if (!isSuccess || !data) return <div>No data</div>;

      return (
        <ul>
          {data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      );
    }

    render(<UserList />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeDefined();
    });

    container.dispose();
  });

  it("has a displayName on the returned component", () => {
    const Wrapper = createQueryTestWrapper();
    expect(Wrapper.displayName).toBe("QueryTestWrapper");
  });
});

// =============================================================================
// createQueryTestWrapperProps
// =============================================================================

describe("createQueryTestWrapperProps", () => {
  it("returns the queryClient from config", () => {
    const container = createQueryTestContainer();
    const props = createQueryTestWrapperProps({ queryClient: container.queryClient });

    expect(props.queryClient).toBe(container.queryClient);

    container.dispose();
  });
});
