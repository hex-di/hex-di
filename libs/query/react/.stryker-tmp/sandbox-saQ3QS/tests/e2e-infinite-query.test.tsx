/**
 * E2E tests for infinite query pagination.
 *
 * Tests fetchNextPage and hasNextPage through React components.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useInfiniteQuery } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Setup
// =============================================================================

interface PageData {
  readonly items: readonly string[];
  readonly nextCursor: string | undefined;
}

const PaginatedPort = createQueryPort<PageData, { __pageParam?: unknown }, Error>()({
  name: "E2EPaginated",
});

const pages: Record<string, PageData> = {
  "cursor-0": { items: ["item-1", "item-2"], nextCursor: "cursor-1" },
  "cursor-1": { items: ["item-3", "item-4"], nextCursor: "cursor-2" },
  "cursor-2": { items: ["item-5"], nextCursor: undefined },
};

// =============================================================================
// Tests
// =============================================================================

describe("Infinite query E2E", () => {
  it("fetchNextPage loads additional pages", async () => {
    const container = createTestContainer();
    container.register(PaginatedPort, (params: { __pageParam?: unknown }) => {
      const cursor = (params.__pageParam ?? "cursor-0") as string;
      const page = pages[cursor];
      if (!page) return ResultAsync.err(new Error("Not found"));
      return ResultAsync.ok(page);
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function PaginatedList() {
      const state = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "cursor-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      if (state.isPending) return <div>Loading...</div>;
      if (state.isError) return <div>Error</div>;

      const allItems = state.data?.pages.flatMap(p => p.items) ?? [];

      return (
        <div>
          <ul>
            {allItems.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <span>Items: {allItems.length}</span>
          {state.hasNextPage && (
            <button onClick={() => void state.fetchNextPage()}>Load More</button>
          )}
          {!state.hasNextPage && <span>No more pages</span>}
        </div>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <PaginatedList />
      </QueryClientProvider>
    );

    // Wait for first page
    await waitFor(() => {
      expect(screen.getByText("Items: 2")).toBeDefined();
    });

    // Load second page
    await act(async () => {
      fireEvent.click(screen.getByText("Load More"));
    });

    await waitFor(() => {
      expect(screen.getByText("Items: 4")).toBeDefined();
    });

    // Load third (last) page
    await act(async () => {
      fireEvent.click(screen.getByText("Load More"));
    });

    await waitFor(() => {
      expect(screen.getByText("Items: 5")).toBeDefined();
      expect(screen.getByText("No more pages")).toBeDefined();
    });

    client.dispose();
  });

  it("hasNextPage is false when no more data", async () => {
    const container = createTestContainer();
    container.register(PaginatedPort, () =>
      ResultAsync.ok({ items: ["only-item"], nextCursor: undefined })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function SinglePage() {
      const state = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "start",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      if (state.isPending) return <div>Loading...</div>;

      return (
        <div>
          <span>HasNext: {state.hasNextPage ? "yes" : "no"}</span>
        </div>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <SinglePage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("HasNext: no")).toBeDefined();
    });

    client.dispose();
  });
});
