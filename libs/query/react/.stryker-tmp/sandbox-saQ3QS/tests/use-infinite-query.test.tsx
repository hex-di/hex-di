import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useInfiniteQuery } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Ports
// =============================================================================

interface PageResult {
  readonly items: readonly string[];
  readonly nextCursor: string | undefined;
  readonly prevCursor: string | undefined;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const PaginatedPort = createQueryPort<
  PageResult,
  { cursor?: string; __pageParam?: unknown },
  ApiError
>()({
  name: "InfinitePaginated",
});

// =============================================================================
// Helpers
// =============================================================================

function createPaginatedClient(): QueryClient {
  const pages: Record<string, PageResult> = {
    "page-0": {
      items: ["item-1", "item-2"],
      nextCursor: "page-1",
      prevCursor: undefined,
    },
    "page-1": {
      items: ["item-3", "item-4"],
      nextCursor: "page-2",
      prevCursor: "page-0",
    },
    "page-2": {
      items: ["item-5"],
      nextCursor: undefined,
      prevCursor: "page-1",
    },
  };

  const container = createTestContainer();
  container.register(PaginatedPort, (params: { cursor?: string; __pageParam?: unknown }) => {
    const cursor = (params.__pageParam ?? params.cursor ?? "page-0") as string;
    const page = pages[cursor];
    if (!page) {
      return ResultAsync.err({ _tag: "NotFound", message: `Page ${cursor} not found` });
    }
    return ResultAsync.ok(page);
  });

  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Tests
// =============================================================================

describe("useInfiniteQuery", () => {
  it("fetches initial page", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data, isPending, isSuccess } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      if (isPending) return <div>Loading...</div>;
      if (!isSuccess || !data) return <div>No data</div>;

      return (
        <div>
          <span>Pages: {data.pages.length}</span>
          <span>Items: {data.pages.flatMap(p => p.items).join(", ")}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Pages: 1")).toBeDefined();
      expect(screen.getByText("Items: item-1, item-2")).toBeDefined();
    });

    client.dispose();
  });

  it("fetches next page", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data, isSuccess, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      if (!isSuccess || !data) return <div>Loading...</div>;

      return (
        <div>
          <span>Pages: {data.pages.length}</span>
          {hasNextPage && (
            <button onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
              Load More
            </button>
          )}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Pages: 1")).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Load More"));
    });

    await waitFor(() => {
      expect(screen.getByText("Pages: 2")).toBeDefined();
    });

    client.dispose();
  });

  it("reports hasNextPage correctly", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { isSuccess, hasNextPage, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      if (!isSuccess || !data) return <div>Loading...</div>;
      return <div>HasNext: {hasNextPage ? "yes" : "no"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      // First page has nextCursor, so hasNextPage should be true
      expect(screen.getByText("HasNext: yes")).toBeDefined();
    });

    client.dispose();
  });

  it("respects enabled option", () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { isPending, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          enabled: false,
          initialPageParam: "page-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      return <div>{isPending && !data ? "Pending" : "Has data"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Pending")).toBeDefined();
    client.dispose();
  });

  it("returns isFetching during page load", async () => {
    const client = createPaginatedClient();
    const fetchingStates: boolean[] = [];

    function TestComponent() {
      const { isFetching, isSuccess, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      fetchingStates.push(isFetching);

      if (!isSuccess || !data) return <div>Loading...</div>;
      return <div>Pages: {data.pages.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Pages: 1")).toBeDefined();
    });

    expect(fetchingStates.length).toBeGreaterThan(0);
    client.dispose();
  });

  it("accumulates pages with correct pageParams", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data, isSuccess, fetchNextPage, hasNextPage } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      if (!isSuccess || !data) return <div>Loading...</div>;

      const allItems = data.pages.flatMap(p => p.items);
      return (
        <div>
          <span>Items: {allItems.join(", ")}</span>
          <span>PageParams: {data.pageParams.length}</span>
          {hasNextPage && <button onClick={() => void fetchNextPage()}>More</button>}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Items: item-1, item-2")).toBeDefined();
      expect(screen.getByText("PageParams: 1")).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("More"));
    });

    await waitFor(() => {
      expect(screen.getByText("Items: item-1, item-2, item-3, item-4")).toBeDefined();
      expect(screen.getByText("PageParams: 2")).toBeDefined();
    });

    client.dispose();
  });

  it("hasPreviousPage is false without getPreviousPageParam", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { isSuccess, hasPreviousPage, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      if (!isSuccess || !data) return <div>Loading...</div>;
      return <div>HasPrev: {hasPreviousPage ? "yes" : "no"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("HasPrev: no")).toBeDefined();
    });

    client.dispose();
  });

  it("data is undefined while pending", () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data, isPending } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          enabled: false,
          initialPageParam: "page-0",
          getNextPageParam: lastPage => lastPage.nextCursor,
        }
      );

      return (
        <div>
          <span>Pending: {String(isPending)}</span>
          <span>Data: {data === undefined ? "undefined" : "exists"}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Pending: true")).toBeDefined();
    expect(screen.getByText("Data: undefined")).toBeDefined();
    client.dispose();
  });
});
