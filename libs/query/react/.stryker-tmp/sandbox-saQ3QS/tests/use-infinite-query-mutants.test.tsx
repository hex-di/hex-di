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
  name: "InfMutPaginated",
});

// =============================================================================
// Helpers
// =============================================================================

function createPaginatedClient(pages?: Record<string, PageResult>): QueryClient {
  const defaultPages: Record<string, PageResult> = {
    "page-0": { items: ["item-1", "item-2"], nextCursor: "page-1", prevCursor: undefined },
    "page-1": { items: ["item-3", "item-4"], nextCursor: "page-2", prevCursor: "page-0" },
    "page-2": { items: ["item-5"], nextCursor: undefined, prevCursor: "page-1" },
  };
  const data = pages ?? defaultPages;

  const container = createTestContainer();
  container.register(PaginatedPort, (params: { cursor?: string; __pageParam?: unknown }) => {
    const cursor = (params.__pageParam ?? params.cursor ?? "page-0") as string;
    const page = data[cursor];
    if (!page) return ResultAsync.err({ _tag: "NotFound", message: `Page ${cursor} not found` });
    return ResultAsync.ok(page);
  });

  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Page accumulation
// =============================================================================

describe("useInfiniteQuery page accumulation (mutation killers)", () => {
  it("next page appends to pages array", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data, isSuccess, hasNextPage, fetchNextPage } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: last => last.nextCursor }
      );

      if (!isSuccess || !data) return <div>Loading</div>;
      return (
        <div>
          <span>Pages: {data.pages.length}</span>
          <span>Items: {data.pages.flatMap(p => p.items).join(",")}</span>
          <span>HasNext: {String(hasNextPage)}</span>
          <button onClick={() => void fetchNextPage()}>Next</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Pages: 1")).toBeDefined());
    expect(screen.getByText("Items: item-1,item-2")).toBeDefined();

    // Fetch next page
    await act(async () => fireEvent.click(screen.getByText("Next")));

    await waitFor(() => expect(screen.getByText("Pages: 2")).toBeDefined());
    expect(screen.getByText("Items: item-1,item-2,item-3,item-4")).toBeDefined();

    client.dispose();
  });

  it("previous page prepends to pages array", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data, isSuccess, hasPreviousPage, fetchPreviousPage, fetchNextPage } =
        useInfiniteQuery(
          PaginatedPort,
          {},
          {
            initialPageParam: "page-1",
            getNextPageParam: last => last.nextCursor,
            getPreviousPageParam: first => first.prevCursor,
          }
        );

      if (!isSuccess || !data) return <div>Loading</div>;
      return (
        <div>
          <span>Pages: {data.pages.length}</span>
          <span>FirstItems: {data.pages[0].items.join(",")}</span>
          <span>HasPrev: {String(hasPreviousPage)}</span>
          <button onClick={() => void fetchPreviousPage()}>Prev</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Pages: 1")).toBeDefined());
    expect(screen.getByText("FirstItems: item-3,item-4")).toBeDefined();

    await act(async () => fireEvent.click(screen.getByText("Prev")));

    await waitFor(() => expect(screen.getByText("Pages: 2")).toBeDefined());
    // Previous page should be prepended
    expect(screen.getByText("FirstItems: item-1,item-2")).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// maxPages
// =============================================================================

describe("useInfiniteQuery maxPages (mutation killers)", () => {
  it("trims oldest pages when maxPages exceeded on next", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data, isSuccess, fetchNextPage } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: last => last.nextCursor,
          maxPages: 2,
        }
      );

      if (!isSuccess || !data) return <div>Loading</div>;
      return (
        <div>
          <span>Pages: {data.pages.length}</span>
          <span>First: {data.pages[0].items[0]}</span>
          <button onClick={() => void fetchNextPage()}>Next</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Pages: 1")).toBeDefined());

    // Add second page
    await act(async () => fireEvent.click(screen.getByText("Next")));
    await waitFor(() => expect(screen.getByText("Pages: 2")).toBeDefined());

    // Add third page — should trim to 2
    await act(async () => fireEvent.click(screen.getByText("Next")));
    await waitFor(() => expect(screen.getByText("Pages: 2")).toBeDefined());
    // The first page (page-0) should have been trimmed
    expect(screen.getByText("First: item-3")).toBeDefined();

    client.dispose();
  });

  it("trims newest pages when maxPages exceeded on previous", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data, isSuccess, fetchNextPage, fetchPreviousPage } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-1",
          getNextPageParam: last => last.nextCursor,
          getPreviousPageParam: first => first.prevCursor,
          maxPages: 2,
        }
      );

      if (!isSuccess || !data) return <div>Loading</div>;
      return (
        <div>
          <span>Pages: {data.pages.length}</span>
          <span>LastItems: {data.pages[data.pages.length - 1].items.join(",")}</span>
          <button onClick={() => void fetchNextPage()}>Next</button>
          <button onClick={() => void fetchPreviousPage()}>Prev</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Pages: 1")).toBeDefined());

    // Fetch next page
    await act(async () => fireEvent.click(screen.getByText("Next")));
    await waitFor(() => expect(screen.getByText("Pages: 2")).toBeDefined());

    // Fetch previous — should trim to 2 from the end
    await act(async () => fireEvent.click(screen.getByText("Prev")));
    await waitFor(() => expect(screen.getByText("Pages: 2")).toBeDefined());

    client.dispose();
  });
});

// =============================================================================
// hasNextPage / hasPreviousPage
// =============================================================================

describe("useInfiniteQuery hasNextPage/hasPreviousPage (mutation killers)", () => {
  it("hasNextPage is true when getNextPageParam returns a value", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { hasNextPage, isSuccess } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: last => last.nextCursor }
      );
      if (!isSuccess) return <div>Loading</div>;
      return <div>HasNext: {String(hasNextPage)}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("HasNext: true")).toBeDefined());
    client.dispose();
  });

  it("hasNextPage is false when getNextPageParam returns undefined", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { hasNextPage, isSuccess, fetchNextPage } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-2", // last page
          getNextPageParam: last => last.nextCursor,
        }
      );
      if (!isSuccess) return <div>Loading</div>;
      return <div>HasNext: {String(hasNextPage)}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("HasNext: false")).toBeDefined());
    client.dispose();
  });

  it("hasPreviousPage is false when getPreviousPageParam is not provided", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { hasPreviousPage, isSuccess } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-1", getNextPageParam: last => last.nextCursor }
      );
      if (!isSuccess) return <div>Loading</div>;
      return <div>HasPrev: {String(hasPreviousPage)}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("HasPrev: false")).toBeDefined());
    client.dispose();
  });

  it("hasPreviousPage is true when getPreviousPageParam returns a value", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { hasPreviousPage, isSuccess } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-1",
          getNextPageParam: last => last.nextCursor,
          getPreviousPageParam: first => first.prevCursor,
        }
      );
      if (!isSuccess) return <div>Loading</div>;
      return <div>HasPrev: {String(hasPreviousPage)}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("HasPrev: true")).toBeDefined());
    client.dispose();
  });
});

// =============================================================================
// fetchNextPage/fetchPreviousPage with no pages
// =============================================================================

describe("useInfiniteQuery fetch with no pages (mutation killers)", () => {
  it("fetchNextPage is no-op when no pages exist", async () => {
    const container = createTestContainer();
    container.register(PaginatedPort, () =>
      ResultAsync.ok({ items: [], nextCursor: undefined, prevCursor: undefined })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { fetchNextPage, isSuccess, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: undefined,
          getNextPageParam: () => undefined,
          enabled: false,
        }
      );

      return (
        <div>
          <span>Pages: {data?.pages.length ?? 0}</span>
          <button onClick={() => void fetchNextPage()}>Next</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Pages: 0")).toBeDefined();

    // Click next — should be a no-op
    await act(async () => fireEvent.click(screen.getByText("Next")));
    expect(screen.getByText("Pages: 0")).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// Initial fetch with enabled
// =============================================================================

describe("useInfiniteQuery enabled option (mutation killers)", () => {
  it("does not fetch when enabled is false", () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { isPending, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: last => last.nextCursor,
          enabled: false,
        }
      );
      return (
        <div>
          Pending: {String(isPending)}, Data: {data ? "yes" : "no"}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Pending: true, Data: no")).toBeDefined();
    client.dispose();
  });

  it("fetches initial page when enabled is true (default)", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { isSuccess, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: last => last.nextCursor }
      );
      if (!isSuccess || !data) return <div>Loading</div>;
      return <div>Items: {data.pages[0].items.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Items: 2")).toBeDefined());
    client.dispose();
  });
});

// =============================================================================
// Derived state
// =============================================================================

describe("useInfiniteQuery derived state (mutation killers)", () => {
  it("isPending is true initially", () => {
    const container = createTestContainer();
    container.register(PaginatedPort, () =>
      ResultAsync.fromSafePromise(new Promise<PageResult>(() => {}))
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isPending, isSuccess, isError } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: () => undefined }
      );
      return (
        <div>
          P:{String(isPending)} S:{String(isSuccess)} E:{String(isError)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("P:true S:false E:false")).toBeDefined();
    client.dispose();
  });

  it("isSuccess is true after successful fetch", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { isPending, isSuccess, isError } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: last => last.nextCursor }
      );
      return (
        <div>
          P:{String(isPending)} S:{String(isSuccess)} E:{String(isError)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("P:false S:true E:false")).toBeDefined());
    client.dispose();
  });

  it("isError is true after failed fetch", async () => {
    const container = createTestContainer();
    container.register(PaginatedPort, () => ResultAsync.err({ _tag: "Error", message: "fail" }));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isPending, isSuccess, isError } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: () => undefined }
      );
      return (
        <div>
          P:{String(isPending)} S:{String(isSuccess)} E:{String(isError)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText(/E:true/)).toBeDefined());
    client.dispose();
  });

  it("data is undefined when no pages loaded", () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: last => last.nextCursor,
          enabled: false,
        }
      );
      return <div>Data: {data === undefined ? "none" : "present"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Data: none")).toBeDefined();
    client.dispose();
  });
});

// =============================================================================
// mergePageParam
// =============================================================================

describe("useInfiniteQuery mergePageParam (mutation killers)", () => {
  it("merges page param into object params", async () => {
    let capturedParams: any;
    const container = createTestContainer();
    container.register(PaginatedPort, (params: any) => {
      capturedParams = params;
      return ResultAsync.ok({ items: ["a"], nextCursor: undefined, prevCursor: undefined });
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isSuccess } = useInfiniteQuery(
        PaginatedPort,
        { cursor: "base" },
        { initialPageParam: "page-0", getNextPageParam: () => undefined }
      );
      if (!isSuccess) return <div>Loading</div>;
      return <div>Done</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());

    expect(capturedParams).toBeDefined();
    expect(capturedParams.__pageParam).toBe("page-0");
    expect(capturedParams.cursor).toBe("base");

    client.dispose();
  });
});

// =============================================================================
// Mounted check
// =============================================================================

describe("useInfiniteQuery mounted check (mutation killers)", () => {
  it("does not update state after unmount", async () => {
    const container = createTestContainer();
    let resolvePromise: ((v: PageResult) => void) | undefined;
    container.register(PaginatedPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<PageResult>(resolve => {
          resolvePromise = resolve;
        })
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isPending } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: () => undefined }
      );
      return <div>Pending: {String(isPending)}</div>;
    }

    const { unmount } = render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Pending: true")).toBeDefined();

    // Unmount before data arrives
    unmount();

    // Resolve after unmount — should not throw
    resolvePromise?.({ items: ["a"], nextCursor: undefined, prevCursor: undefined });

    client.dispose();
  });
});

// =============================================================================
// isFetching state flags during fetch
// =============================================================================

describe("useInfiniteQuery isFetching flags (mutation killers)", () => {
  it("isFetching is true during initial fetch and false after", async () => {
    let resolveFetch: ((v: PageResult) => void) | undefined;
    const container = createTestContainer();
    container.register(PaginatedPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<PageResult>(resolve => {
          resolveFetch = resolve;
        })
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isFetching, isSuccess } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: () => undefined }
      );
      return (
        <div>
          Fetching: {String(isFetching)}, Success: {String(isSuccess)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    // During fetch, isFetching should be true
    await waitFor(() => expect(screen.getByText(/Fetching: true/)).toBeDefined());

    // Resolve the fetch
    await act(async () => {
      resolveFetch?.({ items: ["a"], nextCursor: undefined, prevCursor: undefined });
    });

    await waitFor(() => expect(screen.getByText("Fetching: false, Success: true")).toBeDefined());
    client.dispose();
  });

  it("isFetchingNextPage is true during next page fetch", async () => {
    let resolveNext: ((v: PageResult) => void) | undefined;
    const container = createTestContainer();
    let callCount = 0;
    container.register(PaginatedPort, () => {
      callCount++;
      if (callCount === 1) {
        return ResultAsync.ok({ items: ["a"], nextCursor: "page-1", prevCursor: undefined });
      }
      return ResultAsync.fromSafePromise(
        new Promise<PageResult>(resolve => {
          resolveNext = resolve;
        })
      );
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isFetchingNextPage, isFetchingPreviousPage, isSuccess, fetchNextPage } =
        useInfiniteQuery(
          PaginatedPort,
          {},
          {
            initialPageParam: "page-0",
            getNextPageParam: last => last.nextCursor,
            getPreviousPageParam: first => first.prevCursor,
          }
        );
      return (
        <div>
          <span>FNext: {String(isFetchingNextPage)}</span>
          <span>FPrev: {String(isFetchingPreviousPage)}</span>
          <span>Success: {String(isSuccess)}</span>
          <button onClick={() => void fetchNextPage()}>Next</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Success: true")).toBeDefined());

    // Initially, isFetchingNextPage should be false
    expect(screen.getByText("FNext: false")).toBeDefined();
    expect(screen.getByText("FPrev: false")).toBeDefined();

    // Start fetching next page
    await act(async () => fireEvent.click(screen.getByText("Next")));

    // During next page fetch
    await waitFor(() => expect(screen.getByText("FNext: true")).toBeDefined());
    expect(screen.getByText("FPrev: false")).toBeDefined();

    // Resolve
    await act(async () => {
      resolveNext?.({ items: ["b"], nextCursor: undefined, prevCursor: "page-0" });
    });

    await waitFor(() => expect(screen.getByText("FNext: false")).toBeDefined());
    client.dispose();
  });

  it("isFetchingPreviousPage is true during previous page fetch", async () => {
    let resolvePrev: ((v: PageResult) => void) | undefined;
    const container = createTestContainer();
    let callCount = 0;
    container.register(PaginatedPort, () => {
      callCount++;
      if (callCount === 1) {
        return ResultAsync.ok({ items: ["b"], nextCursor: undefined, prevCursor: "page-0" });
      }
      return ResultAsync.fromSafePromise(
        new Promise<PageResult>(resolve => {
          resolvePrev = resolve;
        })
      );
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isFetchingNextPage, isFetchingPreviousPage, isSuccess, fetchPreviousPage } =
        useInfiniteQuery(
          PaginatedPort,
          {},
          {
            initialPageParam: "page-1",
            getNextPageParam: last => last.nextCursor,
            getPreviousPageParam: first => first.prevCursor,
          }
        );
      return (
        <div>
          <span>FNext: {String(isFetchingNextPage)}</span>
          <span>FPrev: {String(isFetchingPreviousPage)}</span>
          <span>Success: {String(isSuccess)}</span>
          <button onClick={() => void fetchPreviousPage()}>Prev</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Success: true")).toBeDefined());

    // Start fetching previous page
    await act(async () => fireEvent.click(screen.getByText("Prev")));

    // During prev page fetch, isFetchingPreviousPage should be true, not isFetchingNextPage
    await waitFor(() => expect(screen.getByText("FPrev: true")).toBeDefined());
    expect(screen.getByText("FNext: false")).toBeDefined();

    // Resolve
    await act(async () => {
      resolvePrev?.({ items: ["a"], nextCursor: "page-1", prevCursor: undefined });
    });

    await waitFor(() => expect(screen.getByText("FPrev: false")).toBeDefined());
    client.dispose();
  });
});

// =============================================================================
// fetchPreviousPage guards
// =============================================================================

describe("useInfiniteQuery fetchPreviousPage guards (mutation killers)", () => {
  it("fetchPreviousPage is no-op when no pages exist", async () => {
    const container = createTestContainer();
    container.register(PaginatedPort, () =>
      ResultAsync.ok({ items: [], nextCursor: undefined, prevCursor: undefined })
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { fetchPreviousPage, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: undefined,
          getNextPageParam: () => undefined,
          getPreviousPageParam: () => "prev",
          enabled: false,
        }
      );
      return (
        <div>
          <span>Pages: {data?.pages.length ?? 0}</span>
          <button onClick={() => void fetchPreviousPage()}>Prev</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Pages: 0")).toBeDefined();

    await act(async () => fireEvent.click(screen.getByText("Prev")));
    expect(screen.getByText("Pages: 0")).toBeDefined();

    client.dispose();
  });

  it("fetchPreviousPage is no-op when getPreviousPageParam not provided", async () => {
    const client = createPaginatedClient();

    let fetchPrevResult: unknown;
    function TestComponent() {
      const { fetchPreviousPage, isSuccess } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: last => last.nextCursor,
          // NO getPreviousPageParam
        }
      );
      if (!isSuccess) return <div>Loading</div>;
      return (
        <div>
          <span>Done</span>
          <button
            onClick={() => {
              fetchPrevResult = fetchPreviousPage();
            }}
          >
            Prev
          </button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());

    await act(async () => fireEvent.click(screen.getByText("Prev")));
    // Should return ok(undefined), not throw
    expect(fetchPrevResult).toBeDefined();

    client.dispose();
  });

  it("fetchPreviousPage is no-op when prevPageParam is undefined", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { fetchPreviousPage, isSuccess, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-0",
          getNextPageParam: last => last.nextCursor,
          getPreviousPageParam: () => undefined, // always returns undefined
        }
      );
      if (!isSuccess || !data) return <div>Loading</div>;
      return (
        <div>
          <span>Pages: {data.pages.length}</span>
          <button onClick={() => void fetchPreviousPage()}>Prev</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Pages: 1")).toBeDefined());

    await act(async () => fireEvent.click(screen.getByText("Prev")));
    // Still 1 page
    expect(screen.getByText("Pages: 1")).toBeDefined();

    client.dispose();
  });

  it("fetchNextPage is no-op when nextPageParam is undefined", async () => {
    const client = createPaginatedClient();

    function TestComponent() {
      const { fetchNextPage, isSuccess, data } = useInfiniteQuery(
        PaginatedPort,
        {},
        {
          initialPageParam: "page-2", // last page, nextCursor=undefined
          getNextPageParam: last => last.nextCursor,
        }
      );
      if (!isSuccess || !data) return <div>Loading</div>;
      return (
        <div>
          <span>Pages: {data.pages.length}</span>
          <button onClick={() => void fetchNextPage()}>Next</button>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Pages: 1")).toBeDefined());

    await act(async () => fireEvent.click(screen.getByText("Next")));
    expect(screen.getByText("Pages: 1")).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// Error state flags reset
// =============================================================================

describe("useInfiniteQuery error state (mutation killers)", () => {
  it("isFetching/isFetchingNextPage/isFetchingPreviousPage reset on error", async () => {
    const container = createTestContainer();
    container.register(PaginatedPort, () => ResultAsync.err({ _tag: "Error", message: "fail" }));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isFetching, isFetchingNextPage, isFetchingPreviousPage, isError } = useInfiniteQuery(
        PaginatedPort,
        {},
        { initialPageParam: "page-0", getNextPageParam: () => undefined }
      );
      return (
        <div>
          F:{String(isFetching)} FN:{String(isFetchingNextPage)} FP:{String(isFetchingPreviousPage)}{" "}
          E:{String(isError)}
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText(/E:true/)).toBeDefined());
    // All fetch flags should be false after error
    expect(screen.getByText(/F:false/)).toBeDefined();
    expect(screen.getByText(/FN:false/)).toBeDefined();
    expect(screen.getByText(/FP:false/)).toBeDefined();

    client.dispose();
  });
});

// =============================================================================
// mergePageParam for non-object params
// =============================================================================

describe("useInfiniteQuery mergePageParam non-object (mutation killers)", () => {
  it("wraps non-object params with __pageParam", async () => {
    let capturedParams: unknown;
    const StringPort = createQueryPort<PageResult, string, ApiError>()({
      name: "InfMutStringParam",
    });
    const container = createTestContainer();
    container.register(StringPort, (params: unknown) => {
      capturedParams = params;
      return ResultAsync.ok({ items: ["x"], nextCursor: undefined, prevCursor: undefined });
    });
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const { isSuccess } = useInfiniteQuery(StringPort, "some-string" as unknown as string, {
        initialPageParam: "p0",
        getNextPageParam: () => undefined,
      });
      if (!isSuccess) return <div>Loading</div>;
      return <div>Done</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());

    // For non-object params, should create { __pageParam }
    expect(capturedParams).toBeDefined();
    expect((capturedParams as Record<string, unknown>).__pageParam).toBe("p0");

    client.dispose();
  });
});
