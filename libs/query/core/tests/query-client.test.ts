import { describe, it, expect, vi } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryClient,
  createQueryPort,
  createMutationPort,
  type QueryClientEvent,
} from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "Users" });

function createUsersFetcher(data: string[] = ["Alice", "Bob"]) {
  return () => ResultAsync.fromPromise(Promise.resolve(data), () => new Error("fail"));
}

/** Creates a fetcher that waits until the signal is aborted, then rejects with AbortError. */
function abortAwareFetcher<T>() {
  return (_params: unknown, ctx: any) =>
    ResultAsync.fromPromise(
      new Promise<T>((_resolve, reject) => {
        ctx.signal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
      () => new Error("fail")
    );
}

/** Fetcher that checks signal.aborted at start AND listens for future aborts. */
function robustAbortFetcher<T>() {
  return (_params: unknown, ctx: any) =>
    ResultAsync.fromPromise(
      new Promise<T>((_resolve, reject) => {
        if (ctx.signal.aborted) {
          reject(new DOMException("The operation was aborted.", "AbortError"));
          return;
        }
        ctx.signal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
      () => new Error("fail")
    );
}

describe("QueryClient", () => {
  it("createQueryClient() creates a QueryClient", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    expect(client).toBeDefined();
    expect(client.cache).toBeDefined();
    expect(client.isDisposed).toBe(false);
    client.dispose();
  });

  it("createQueryClient(config) applies default options", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { staleTime: 5000 } });
    expect(client.defaults.staleTime).toBe(5000);
    client.dispose();
  });

  it("fetch returns ResultAsync<TData, TError | QueryResolutionError>", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["Alice", "Bob"]);
    }
    client.dispose();
  });

  it("fetch returns Ok with data on successful adapter resolution and fetch", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher(["Charlie"]));
    const client = createQueryClient({ container });
    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["Charlie"]);
    }
    client.dispose();
  });

  it("fetch returns Err with QueryAdapterMissing when no adapter registered", async () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryAdapterMissing");
    }
    client.dispose();
  });

  it("fetch uses cached data when fresh (respects staleTime)", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail"));
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000 } });

    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);
    await client.fetchQuery(UsersPort, undefined);
    // Second fetch should use cache since staleTime=60_000
    expect(fetchCount).toBe(1);
    client.dispose();
  });

  it("fetch refetches when data is stale", async () => {
    let fetchCount = 0;
    let now = 1000;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail"));
    });
    const client = createQueryClient({
      container,
      clock: { now: () => now },
      defaults: { staleTime: 0 },
    });

    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);
    // Advance time to make data stale
    now = 2000;
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(2);
    client.dispose();
  });

  it("fetch deduplicates concurrent requests for same key", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["data"]), 10)),
        () => new Error("fail")
      );
    });
    const client = createQueryClient({ container });

    const p1 = client.fetchQuery(UsersPort, undefined);
    const p2 = client.fetchQuery(UsersPort, undefined);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(fetchCount).toBe(1);
    expect(r1.isOk()).toBe(true);
    expect(r2.isOk()).toBe(true);
    client.dispose();
  });

  it("prefetchQuery populates cache without returning data", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher(["Alice"]));
    const client = createQueryClient({ container });
    await client.prefetchQuery(UsersPort, undefined);
    const data = client.getQueryData(UsersPort, undefined);
    expect(data).toEqual(["Alice"]);
    client.dispose();
  });

  it("ensureQueryData returns cached data if fresh", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher(["Alice"]));
    const client = createQueryClient({ container, defaults: { staleTime: 60_000 } });
    await client.fetchQuery(UsersPort, undefined);

    let fetchCount = 0;
    // Register a new fetcher that counts fetches
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["new"]), () => new Error("fail"));
    });

    const result = await client.ensureQueryData(UsersPort, undefined);
    // Should return cached data, not refetch
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["Alice"]);
    }
    expect(fetchCount).toBe(0);
    client.dispose();
  });

  it("ensureQueryData fetches if data is missing", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher(["Alice"]));
    const client = createQueryClient({ container });
    const result = await client.ensureQueryData(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    client.dispose();
  });

  it("getQueryData returns data from cache", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher(["Alice"]));
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, undefined);
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["Alice"]);
    client.dispose();
  });

  it("getQueryData returns undefined for absent entry", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    expect(client.getQueryData(UsersPort, undefined)).toBeUndefined();
    client.dispose();
  });

  it("setQueryData sets data directly in cache", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    client.setQueryData(UsersPort, undefined, ["Manual"]);
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["Manual"]);
    client.dispose();
  });

  it("invalidate(port, params) marks specific query as stale", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, undefined);
    await client.invalidateQueries(UsersPort, undefined);
    const entry = client.cache.get(UsersPort, undefined);
    expect(entry?.isInvalidated).toBe(true);
    client.dispose();
  });

  it("invalidate(port) without params invalidates all queries for port", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, "p1");
    await client.fetchQuery(UsersPort, "p2");
    await client.invalidateQueries(UsersPort);
    expect(client.cache.get(UsersPort, "p1")?.isInvalidated).toBe(true);
    expect(client.cache.get(UsersPort, "p2")?.isInvalidated).toBe(true);
    client.dispose();
  });

  it("removeQueries(port, params) removes specific entry from cache", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, "p1");
    client.removeQueries(UsersPort, "p1");
    expect(client.cache.has(UsersPort, "p1")).toBe(false);
    client.dispose();
  });

  it("removeQueries(port) without params removes all entries for port", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, "p1");
    await client.fetchQuery(UsersPort, "p2");
    client.removeQueries(UsersPort);
    expect(client.cache.has(UsersPort, "p1")).toBe(false);
    expect(client.cache.has(UsersPort, "p2")).toBe(false);
    client.dispose();
  });

  it("cancelQueries(port, params) cancels in-flight fetch for specific key", async () => {
    const container = createTestContainer();
    container.register(UsersPort, abortAwareFetcher<string[]>());
    const client = createQueryClient({ container });

    const _result = client.fetchQuery(UsersPort, "p1");
    client.cancelQueries(UsersPort, "p1");
    // The cancellation should have been signaled
    client.dispose();
  });

  it("subscribe fires on cache state changes", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    const events: unknown[] = [];
    const unsub = client.subscribe(event => events.push(event));
    await client.fetchQuery(UsersPort, undefined);
    expect(events.length).toBeGreaterThan(0);
    unsub();
    client.dispose();
  });

  it("unsubscribe stops callback delivery", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    const events: unknown[] = [];
    const unsub = client.subscribe(event => events.push(event));
    unsub();
    await client.fetchQuery(UsersPort, undefined);
    // No events after unsubscribe (only the fetch-related events)
    // The subscription was removed before the fetch
    expect(events.length).toBe(0);
    client.dispose();
  });

  it("cache returns the underlying QueryCache", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    expect(client.cache).toBeDefined();
    expect(typeof client.cache.get).toBe("function");
    client.dispose();
  });

  it("createChild() creates a child QueryClient with its own cache", () => {
    const container = createTestContainer();
    const parent = createQueryClient({ container });
    const child = parent.createChild();
    expect(child).toBeDefined();
    expect(child.cache).not.toBe(parent.cache);
    child.dispose();
    parent.dispose();
  });
});

// =============================================================================
// Mutation helpers
// =============================================================================

const CreateUserPort = createMutationPort<string, { name: string }, Error>()({
  name: "CreateUser",
});
const DeleteUserPort = createMutationPort<void, string, Error>()({
  name: "DeleteUser",
  effects: { invalidates: [UsersPort] },
});
const RemoveUserPort = createMutationPort<void, string, Error>()({
  name: "RemoveUser",
  effects: { removes: [UsersPort] },
});

// =============================================================================
// pause / resume
// =============================================================================

describe("QueryClient pause/resume", () => {
  it("pause() sets isPaused to true", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    client.pause();
    expect(client.isPaused).toBe(true);
    client.dispose();
  });

  it("resume() sets isPaused to false", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    client.pause();
    client.resume();
    expect(client.isPaused).toBe(false);
    client.dispose();
  });

  it("initial isPaused is false", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    expect(client.isPaused).toBe(false);
    client.dispose();
  });

  it("toggle works: pause then resume", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    expect(client.isPaused).toBe(false);
    client.pause();
    expect(client.isPaused).toBe(true);
    client.resume();
    expect(client.isPaused).toBe(false);
    client.dispose();
  });
});

// =============================================================================
// isFetching with filters
// =============================================================================

describe("QueryClient isFetching with filters", () => {
  it("no filter returns total count (0 when idle)", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    expect(client.isFetching()).toBe(0);
    client.dispose();
  });

  it("filter by port returns per-port count", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["data"]), 50)),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const p = client.fetchQuery(UsersPort, undefined);
    // While the fetch is in flight the count for this port should be > 0
    expect(client.isFetching({ port: UsersPort })).toBe(1);
    await p;
    client.dispose();
  });

  it("returns 0 when all fetches complete", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, undefined);
    expect(client.isFetching()).toBe(0);
    client.dispose();
  });
});

// =============================================================================
// isMutating
// =============================================================================

describe("QueryClient isMutating", () => {
  it("returns 0 initially", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    expect(client.isMutating()).toBe(0);
    client.dispose();
  });

  it("returns 1 during active mutation", async () => {
    let resolveMutation!: (v: string) => void;
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(
        new Promise<string>(resolve => {
          resolveMutation = resolve;
        }),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const p = client.mutate(CreateUserPort, { name: "Alice" });
    // Give the async mutation time to start
    await new Promise(r => setTimeout(r, 0));
    expect(client.isMutating()).toBe(1);
    resolveMutation("alice-id");
    await p;
    expect(client.isMutating()).toBe(0);
    client.dispose();
  });
});

// =============================================================================
// subscribeToEvents
// =============================================================================

describe("QueryClient subscribeToEvents", () => {
  it("delivers fetch-started event with portName", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, undefined);

    const started = events.find(e => e.type === "fetch-started");
    expect(started).toBeDefined();
    expect(started!.portName).toBe("Users");
    client.dispose();
  });

  it("delivers fetch-completed event with durationMs", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, undefined);

    const completed = events.find(e => e.type === "fetch-completed");
    expect(completed).toBeDefined();
    expect(completed!.type).toBe("fetch-completed");
    if (completed!.type === "fetch-completed") {
      expect(typeof completed!.durationMs).toBe("number");
    }
    client.dispose();
  });

  it("delivers cache-hit on cache hit", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container, defaults: { staleTime: 60_000 } });
    await client.fetchQuery(UsersPort, undefined);

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));
    await client.fetchQuery(UsersPort, undefined);

    const cacheHit = events.find(e => e.type === "cache-hit");
    expect(cacheHit).toBeDefined();
    expect(cacheHit!.portName).toBe("Users");
    client.dispose();
  });

  it("unsubscribe stops event delivery", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    const events: QueryClientEvent[] = [];
    const unsub = client.subscribeToEvents(e => events.push(e));
    unsub();

    await client.fetchQuery(UsersPort, undefined);
    expect(events.length).toBe(0);
    client.dispose();
  });
});

// =============================================================================
// Mutation callbacks
// =============================================================================

describe("QueryClient mutation callbacks", () => {
  it("onMutate callback receives input", async () => {
    const onMutate = vi.fn();
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve("id-1"), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    await client.mutate(CreateUserPort, { name: "Alice" }, { onMutate });
    expect(onMutate).toHaveBeenCalledWith({ name: "Alice" });
    client.dispose();
  });

  it("onSuccess callback receives data, input, and context", async () => {
    const onSuccess = vi.fn();
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve("id-1"), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    await client.mutate(
      CreateUserPort,
      { name: "Alice" },
      {
        onMutate: () => "ctx-value" as any,
        onSuccess,
      }
    );
    expect(onSuccess).toHaveBeenCalledWith("id-1", { name: "Alice" }, "ctx-value");
    client.dispose();
  });

  it("onError callback receives error, input, and context", async () => {
    const onError = vi.fn();
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("boom")), e => e as Error)
    );
    const client = createQueryClient({ container });

    await client.mutate(CreateUserPort, { name: "Alice" }, { onError });
    expect(onError).toHaveBeenCalled();
    const [error, input] = onError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(input).toEqual({ name: "Alice" });
    client.dispose();
  });

  it("onSettled called after success (data defined, error undefined)", async () => {
    const onSettled = vi.fn();
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve("id-1"), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    await client.mutate(CreateUserPort, { name: "Alice" }, { onSettled });
    expect(onSettled).toHaveBeenCalled();
    const [data, error] = onSettled.mock.calls[0];
    expect(data).toBe("id-1");
    expect(error).toBeUndefined();
    client.dispose();
  });

  it("onSettled called after error (data undefined, error defined)", async () => {
    const onSettled = vi.fn();
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("boom")), e => e as Error)
    );
    const client = createQueryClient({ container });

    await client.mutate(CreateUserPort, { name: "Alice" }, { onSettled });
    expect(onSettled).toHaveBeenCalled();
    const [data, error] = onSettled.mock.calls[0];
    expect(data).toBeUndefined();
    expect(error).toBeDefined();
    client.dispose();
  });
});

// =============================================================================
// Effect processing
// =============================================================================

describe("QueryClient effect processing", () => {
  it("effects.invalidates fires invalidation on related query port", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    container.register(DeleteUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve(undefined), () => new Error("fail"))
    );
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, undefined);
    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(false);

    await client.mutate(DeleteUserPort, "user-1");
    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(true);
    client.dispose();
  });

  it("effects.removes fires removal on related query port", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    container.register(RemoveUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve(undefined), () => new Error("fail"))
    );
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, undefined);
    expect(client.cache.has(UsersPort, undefined)).toBe(true);

    await client.mutate(RemoveUserPort, "user-1");
    expect(client.cache.has(UsersPort, undefined)).toBe(false);
    client.dispose();
  });

  it("effects skip on mutation error (effects only run on success)", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    container.register(DeleteUserPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("boom")), e => e as Error)
    );
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, undefined);

    await client.mutate(DeleteUserPort, "user-1");
    // Effects should NOT have run, so cache should remain valid
    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(false);
    client.dispose();
  });

  it("undefined effects is fine (no crash)", async () => {
    const container = createTestContainer();
    // CreateUserPort has no effects defined
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve("id-1"), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    const result = await client.mutate(CreateUserPort, { name: "Alice" });
    expect(result.isOk()).toBe(true);
    client.dispose();
  });
});

// =============================================================================
// cancelQueries
// =============================================================================

describe("QueryClient cancelQueries", () => {
  it("cancels specific key with params", async () => {
    const container = createTestContainer();
    container.register(UsersPort, abortAwareFetcher<string[]>());
    const client = createQueryClient({ container });

    const p = client.fetchQuery(UsersPort, "p1");
    client.cancelQueries(UsersPort, "p1");
    const result = await p;
    expect(result.isErr()).toBe(true);
    client.dispose();
  });

  it("without params, cancels all matching port (uses portName prefix)", async () => {
    const container = createTestContainer();
    container.register(UsersPort, abortAwareFetcher<string[]>());
    const client = createQueryClient({ container });

    const p1 = client.fetchQuery(UsersPort, "a");
    const p2 = client.fetchQuery(UsersPort, "b");
    client.cancelQueries(UsersPort);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.isErr()).toBe(true);
    expect(r2.isErr()).toBe(true);
    client.dispose();
  });

  it("doesn't cancel other ports (abort-aware, verifies isolation)", async () => {
    const OtherPort = createQueryPort<number[], unknown>()({ name: "Other" });
    const container = createTestContainer();
    let otherAborted = false;
    container.register(UsersPort, abortAwareFetcher<string[]>());
    container.register(OtherPort, (_params: unknown, ctx: any) =>
      ResultAsync.fromPromise(
        new Promise<number[]>((resolve, reject) => {
          const timer = setTimeout(() => resolve([1, 2, 3]), 50);
          ctx.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            otherAborted = true;
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const pUsers = client.fetchQuery(UsersPort, undefined);
    const pOther = client.fetchQuery(OtherPort, undefined);
    client.cancelQueries(UsersPort);

    const rUsers = await pUsers;
    expect(rUsers.isErr()).toBe(true);
    // OtherPort was NOT cancelled by cancelQueries(UsersPort)
    expect(otherAborted).toBe(false);

    const rOther = await pOther;
    expect(rOther.isOk()).toBe(true);
    client.dispose();
  });
});

// =============================================================================
// Fetch error path
// =============================================================================

describe("QueryClient fetch error path", () => {
  it("error from fetcher sets cache error entry", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("network-down")), e => e as Error)
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);

    const entry = client.cache.get(UsersPort, undefined);
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("error");
    client.dispose();
  });

  it("disposed client returns QueryDisposed error", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    client.dispose();

    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryDisposed");
    }
  });
});

// =============================================================================
// Dedup/cancel events
// =============================================================================

describe("QueryClient dedup/cancel events", () => {
  it("only one fetch-started event emitted on concurrent request for same key", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["data"]), 10)),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    const p1 = client.fetchQuery(UsersPort, undefined);
    const p2 = client.fetchQuery(UsersPort, undefined);
    await Promise.all([p1, p2]);

    // Because dedup reuses the same promise, only one fetch-started should fire
    const started = events.filter(e => e.type === "fetch-started");
    expect(started.length).toBe(1);
    client.dispose();
  });

  it("fetch-cancelled event emitted on cancelQueries", async () => {
    const container = createTestContainer();
    container.register(UsersPort, abortAwareFetcher<string[]>());
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    const p = client.fetchQuery(UsersPort, "x");
    client.cancelQueries(UsersPort, "x");
    await p;

    const cancelled = events.find(e => e.type === "fetch-cancelled");
    expect(cancelled).toBeDefined();
    expect(cancelled!.portName).toBe("Users");
    client.dispose();
  });
});

// =============================================================================
// New mutation-killing tests
// =============================================================================

describe("QueryClient fetchingCounts decrement", () => {
  it("isFetching decreases after a fetch completes", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["data"]), 20)),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const p1 = client.fetchQuery(UsersPort, "a");
    const p2 = client.fetchQuery(UsersPort, "b");

    // Two distinct params => two in-flight fetches
    expect(client.isFetching({ port: UsersPort })).toBe(2);

    await p1;
    // After p1 completes, should have 1 in-flight for this port
    expect(client.isFetching({ port: UsersPort })).toBeLessThanOrEqual(1);

    await p2;
    // After both complete, should have 0
    expect(client.isFetching({ port: UsersPort })).toBe(0);
    client.dispose();
  });
});

describe("QueryClient isFetching total across multiple ports", () => {
  it("isFetching() without filter returns total across all ports", async () => {
    const PostsPort = createQueryPort<string[], unknown>()({ name: "PostsForCount" });
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["u"]), 50)),
        () => new Error("fail")
      )
    );
    container.register(PostsPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["p"]), 50)),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const p1 = client.fetchQuery(UsersPort, "a");
    const p2 = client.fetchQuery(PostsPort, "b");

    // Total should be 2 (one per port)
    expect(client.isFetching()).toBe(2);
    expect(client.isFetching({ port: UsersPort })).toBe(1);
    expect(client.isFetching({ port: PostsPort })).toBe(1);

    await Promise.all([p1, p2]);
    expect(client.isFetching()).toBe(0);
    client.dispose();
  });
});

describe("QueryClient combineSignals", () => {
  it("pre-aborted option signal causes immediate abort", async () => {
    const container = createTestContainer();
    container.register(UsersPort, robustAbortFetcher<string[]>());
    const client = createQueryClient({ container });

    const abortController = new AbortController();
    abortController.abort(); // pre-aborted

    const result = await client.fetchQuery(UsersPort, "pre-aborted", {
      signal: abortController.signal,
    });
    expect(result.isErr()).toBe(true);
    client.dispose();
  });

  it("option.signal abort propagates to fetch", async () => {
    const container = createTestContainer();
    container.register(UsersPort, abortAwareFetcher<string[]>());
    const client = createQueryClient({ container });

    const abortController = new AbortController();
    const p = client.fetchQuery(UsersPort, "signal-abort", { signal: abortController.signal });

    // Abort from option signal
    abortController.abort();

    const result = await p;
    expect(result.isErr()).toBe(true);
    client.dispose();
  });

  it("both signals work independently", async () => {
    const container = createTestContainer();
    container.register(UsersPort, abortAwareFetcher<string[]>());
    const client = createQueryClient({ container });

    const externalController = new AbortController();
    const p = client.fetchQuery(UsersPort, "both-signals", { signal: externalController.signal });

    // Cancel via internal cancelQueries (which aborts signal2 / controller.signal)
    client.cancelQueries(UsersPort, "both-signals");

    const result = await p;
    expect(result.isErr()).toBe(true);
    client.dispose();
  });
});

describe("QueryClient mutation events success field", () => {
  it("mutation-completed has success: true on successful mutation", async () => {
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve("id-1"), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.mutate(CreateUserPort, { name: "Alice" });

    const completed = events.find(e => e.type === "mutation-completed");
    expect(completed).toBeDefined();
    if (completed?.type === "mutation-completed") {
      expect(completed.success).toBe(true);
    }
    client.dispose();
  });

  it("mutation-completed has success: false on failed mutation", async () => {
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("boom")), e => e as Error)
    );
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.mutate(CreateUserPort, { name: "Alice" });

    const completed = events.find(e => e.type === "mutation-completed");
    expect(completed).toBeDefined();
    if (completed?.type === "mutation-completed") {
      expect(completed.success).toBe(false);
    }
    client.dispose();
  });
});

describe("QueryClient child client creation", () => {
  it("child inherits clock and defaults from parent config", () => {
    const container = createTestContainer();
    const parent = createQueryClient({
      container,
      defaults: { staleTime: 12345 },
    });
    const child = parent.createChild();
    expect(child.defaults.staleTime).toBe(12345);
    child.dispose();
    parent.dispose();
  });

  it("child has its own independent cache", () => {
    const container = createTestContainer();
    const parent = createQueryClient({ container });
    parent.setQueryData(UsersPort, "p1", ["parent-data"]);
    const child = parent.createChild();
    // Child should not have parent's data
    expect(child.getQueryData(UsersPort, "p1")).toBeUndefined();
    child.dispose();
    parent.dispose();
  });
});

describe("QueryClient dispose guard", () => {
  it("double-dispose is safe (no throw)", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    client.dispose();
    expect(() => client.dispose()).not.toThrow();
    expect(client.isDisposed).toBe(true);
  });
});

describe("QueryClient cancelQueries \\0 separator", () => {
  it("cancelQueries without params uses \\0 separator to match port correctly", async () => {
    // This tests that cancelQueries uses portName + "\0" as prefix separator
    // so that "Users" doesn't match "UsersExtra"
    const UsersExtraPort = createQueryPort<string[], unknown>()({ name: "UsersExtra" });
    const container = createTestContainer();
    let extraAborted = false;

    container.register(UsersPort, abortAwareFetcher<string[]>());
    container.register(UsersExtraPort, (_params: unknown, ctx: any) =>
      ResultAsync.fromPromise(
        new Promise<string[]>((resolve, reject) => {
          const timer = setTimeout(() => resolve(["extra"]), 50);
          ctx.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            extraAborted = true;
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const pUsers = client.fetchQuery(UsersPort, "x");
    const pExtra = client.fetchQuery(UsersExtraPort, "y");

    // Cancel only "Users" port (not "UsersExtra")
    client.cancelQueries(UsersPort);

    const rUsers = await pUsers;
    expect(rUsers.isErr()).toBe(true);

    // "UsersExtra" should NOT be cancelled
    expect(extraAborted).toBe(false);
    const rExtra = await pExtra;
    expect(rExtra.isOk()).toBe(true);

    client.dispose();
  });
});

describe("QueryClient ensureQueryData when isInvalidated", () => {
  it("returns cached data when entry exists with data and !isInvalidated", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher(["Alice"]));
    const client = createQueryClient({ container, defaults: { staleTime: 60_000 } });
    await client.fetchQuery(UsersPort, undefined);

    // Verify entry is NOT invalidated
    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(false);

    let fetchCount = 0;
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["new"]), () => new Error("fail"));
    });

    const result = await client.ensureQueryData(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["Alice"]);
    }
    expect(fetchCount).toBe(0);
    client.dispose();
  });

  it("fetches when isInvalidated is true", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher(["Alice"]));
    const client = createQueryClient({ container, defaults: { staleTime: 60_000 } });
    await client.fetchQuery(UsersPort, undefined);

    // Invalidate the entry
    client.cache.invalidate(UsersPort, undefined);
    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(true);

    let fetchCount = 0;
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["refetched"]), () => new Error("fail"));
    });

    const result = await client.ensureQueryData(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    expect(fetchCount).toBe(1);
    client.dispose();
  });
});

// =============================================================================
// Targeted mutation-killing tests (round 2)
// =============================================================================

describe("QueryClient event type string assertions", () => {
  it("fetch-started has exact type 'fetch-started'", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, undefined);

    const started = events.find(e => e.type === "fetch-started");
    expect(started).toBeDefined();
    expect(started!.type).toBe("fetch-started");
    expect(started!.type).not.toBe("");
    client.dispose();
  });

  it("fetch-completed has exact type 'fetch-completed' and durationMs >= 0", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, undefined);

    const completed = events.find(e => e.type === "fetch-completed");
    expect(completed).toBeDefined();
    expect(completed!.type).toBe("fetch-completed");
    if (completed?.type === "fetch-completed") {
      expect(completed.durationMs).toBeGreaterThanOrEqual(0);
    }
    client.dispose();
  });

  it("cache-hit has exact type 'cache-hit'", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container, defaults: { staleTime: 60_000 } });
    await client.fetchQuery(UsersPort, undefined);

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));
    await client.fetchQuery(UsersPort, undefined); // hits cache

    const hit = events.find(e => e.type === "cache-hit");
    expect(hit).toBeDefined();
    expect(hit!.type).toBe("cache-hit");
    client.dispose();
  });

  it("invalidated has exact type 'invalidated'", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    await client.fetchQuery(UsersPort, undefined);

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));
    await client.invalidateQueries(UsersPort);

    const invalidated = events.find(e => e.type === "invalidated");
    expect(invalidated).toBeDefined();
    expect(invalidated!.type).toBe("invalidated");
    client.dispose();
  });

  it("mutation-started has exact type 'mutation-started'", async () => {
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));
    await client.mutate(CreateUserPort, { name: "test" });

    const started = events.find(e => e.type === "mutation-started");
    expect(started).toBeDefined();
    expect(started!.type).toBe("mutation-started");
    client.dispose();
  });

  it("mutation-completed has exact type 'mutation-completed'", async () => {
    const container = createTestContainer();
    container.register(CreateUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));
    await client.mutate(CreateUserPort, { name: "test" });

    const completed = events.find(e => e.type === "mutation-completed");
    expect(completed).toBeDefined();
    expect(completed!.type).toBe("mutation-completed");
    client.dispose();
  });
});

describe("QueryClient decrementFetching edge", () => {
  it("decrement when count is 1 removes from map (isFetching returns 0)", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["data"]), 10)),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const p = client.fetchQuery(UsersPort, "single");
    expect(client.isFetching({ port: UsersPort })).toBe(1);
    await p;
    expect(client.isFetching({ port: UsersPort })).toBe(0);
    client.dispose();
  });
});

describe("QueryClient invalidateQueries branching", () => {
  it("with params invalidates only specific entry", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    await client.fetchQuery(UsersPort, "a");
    await client.fetchQuery(UsersPort, "b");

    await client.invalidateQueries(UsersPort, "a");

    expect(client.cache.get(UsersPort, "a")?.isInvalidated).toBe(true);
    expect(client.cache.get(UsersPort, "b")?.isInvalidated).toBe(false);
    client.dispose();
  });

  it("without params invalidates all entries for port", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    await client.fetchQuery(UsersPort, "a");
    await client.fetchQuery(UsersPort, "b");

    await client.invalidateQueries(UsersPort);

    expect(client.cache.get(UsersPort, "a")?.isInvalidated).toBe(true);
    expect(client.cache.get(UsersPort, "b")?.isInvalidated).toBe(true);
    client.dispose();
  });
});

describe("QueryClient isFetching filter boundary", () => {
  it("isFetching with unknown port filter returns 0", () => {
    const UnknownPort = createQueryPort<string[], unknown>()({ name: "Unknown" });
    const container = createTestContainer();
    const client = createQueryClient({ container });
    expect(client.isFetching({ port: UnknownPort })).toBe(0);
    client.dispose();
  });
});

describe("QueryClient subscribeToEvents unsubscribe", () => {
  it("after unsubscribe, events no longer delivered", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    const unsub = client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, undefined);
    expect(events.length).toBeGreaterThan(0);

    const count = events.length;
    unsub();

    await client.invalidateQueries(UsersPort);
    await client.fetchQuery(UsersPort, undefined);

    // No new events after unsubscribe
    expect(events.length).toBe(count);
    client.dispose();
  });
});

// =============================================================================
// Round 3: Aggressive mutant-killing tests for query-client.ts
// =============================================================================

describe("QueryClient isStale boundary (targeted)", () => {
  it("staleTime=0 means data is stale after any time passes", async () => {
    let fetchCount = 0;
    let now = 1000;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail"));
    });
    const client = createQueryClient({
      container,
      clock: { now: () => now },
      defaults: { staleTime: 0 },
    });

    await client.fetchQuery(UsersPort, undefined); // dataUpdatedAt = 1000
    expect(fetchCount).toBe(1);

    // Advance clock by 1ms — now - dataUpdatedAt = 1 > 0 → stale
    now = 1001;
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(2);
    client.dispose();
  });

  it("staleTime=Infinity means data never becomes stale", async () => {
    let fetchCount = 0;
    let now = 1000;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail"));
    });
    const client = createQueryClient({
      container,
      clock: { now: () => now },
      defaults: { staleTime: Infinity },
    });

    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);

    now = 999_999_999;
    await client.fetchQuery(UsersPort, undefined);
    // Should still use cache
    expect(fetchCount).toBe(1);
    client.dispose();
  });

  it("data becomes stale exactly when clock exceeds staleTime", async () => {
    let fetchCount = 0;
    let now = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail"));
    });
    const client = createQueryClient({
      container,
      clock: { now: () => now },
      defaults: { staleTime: 100 },
    });

    await client.fetchQuery(UsersPort, undefined); // dataUpdatedAt = 0
    expect(fetchCount).toBe(1);

    // At exactly staleTime boundary: now - dataUpdatedAt = 100 > 100 is false (not stale)
    now = 100;
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);

    // One ms past: 101 - 0 = 101 > 100 is true (stale)
    now = 101;
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(2);
    client.dispose();
  });
});

describe("QueryClient invalidateQueries refetch behavior (targeted)", () => {
  it("invalidateQueries refetches observed queries", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(
        Promise.resolve(["data" + fetchCount]),
        () => new Error("fail")
      );
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    await client.fetchQuery(UsersPort, "observed");
    expect(fetchCount).toBe(1);

    // Add observer
    client.cache.incrementObservers(UsersPort, "observed");

    // Invalidate should trigger refetch because observer count > 0
    await client.invalidateQueries(UsersPort, "observed");
    expect(fetchCount).toBe(2);

    // Verify data was updated
    const entry = client.cache.get(UsersPort, "observed");
    expect(entry?.data).toEqual(["data2"]);
    expect(entry?.isInvalidated).toBe(false); // no longer invalidated after refetch

    client.cache.decrementObservers(UsersPort, "observed");
    client.dispose();
  });

  it("invalidateQueries does NOT refetch unobserved queries", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail"));
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    await client.fetchQuery(UsersPort, "unobserved");
    expect(fetchCount).toBe(1);

    // No observer increment — observerCount is 0
    await client.invalidateQueries(UsersPort, "unobserved");
    // Should NOT have refetched since no observers
    expect(fetchCount).toBe(1);
    client.dispose();
  });
});

describe("QueryClient fetch-error event emission (targeted)", () => {
  it("emits fetch-error event on non-abort fetch failure", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("network")), e => e as Error)
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, undefined);

    const fetchError = events.find(e => e.type === "fetch-error");
    expect(fetchError).toBeDefined();
    expect(fetchError!.portName).toBe("Users");
    if (fetchError!.type === "fetch-error") {
      expect(typeof fetchError!.durationMs).toBe("number");
      expect(fetchError!.durationMs).toBeGreaterThanOrEqual(0);
    }
    client.dispose();
  });
});

describe("QueryClient durationMs computation (targeted)", () => {
  it("fetch-completed durationMs reflects actual elapsed time", async () => {
    let now = 1000;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      // Simulate time passage during fetch
      now = 1050;
      return ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail"));
    });
    const client = createQueryClient({
      container,
      clock: { now: () => now },
      defaults: { retry: 0 },
    });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, undefined);

    const completed = events.find(e => e.type === "fetch-completed");
    expect(completed).toBeDefined();
    if (completed?.type === "fetch-completed") {
      expect(completed.durationMs).toBe(50); // 1050 - 1000
    }
    client.dispose();
  });
});

describe("QueryClient ensureQueryData (targeted)", () => {
  it("ensureQueryData fetches when data exists but is invalidated", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["v" + fetchCount]), () => new Error("fail"));
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000 } });

    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);

    // Invalidate directly via cache
    client.cache.invalidate(UsersPort, undefined);

    // ensureQueryData should refetch because isInvalidated=true
    const result = await client.ensureQueryData(UsersPort, undefined);
    expect(fetchCount).toBe(2);
    expect(result.isOk()).toBe(true);
    client.dispose();
  });

  it("ensureQueryData returns cached data if present and not invalidated", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve(["cached"]), () => new Error("fail"));
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000 } });

    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);

    const result = await client.ensureQueryData(UsersPort, undefined);
    // Should not refetch
    expect(fetchCount).toBe(1);
    if (result.isOk()) {
      expect(result.value).toEqual(["cached"]);
    }
    client.dispose();
  });
});

describe("QueryClient getQueryData boundary (targeted)", () => {
  it("getQueryData returns undefined when entry exists but data is undefined (pending)", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    // Create pending entry
    client.cache.getOrCreate(UsersPort, "pending");
    const data = client.getQueryData(UsersPort, "pending");
    expect(data).toBeUndefined();
    client.dispose();
  });
});

describe("QueryClient cancelQueries port prefix matching (targeted)", () => {
  it("cancelQueries uses portName + NUL separator to match keys", async () => {
    // Ensure a port with similar name prefix doesn't get cancelled
    const UsersPrefixPort = createQueryPort<string[], unknown>()({ name: "UsersPrefix" });
    const container = createTestContainer();
    let prefixAborted = false;
    container.register(UsersPort, abortAwareFetcher<string[]>());
    container.register(UsersPrefixPort, (_params: unknown, ctx: any) =>
      ResultAsync.fromPromise(
        new Promise<string[]>((resolve, reject) => {
          const timer = setTimeout(() => resolve(["ok"]), 50);
          ctx.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            prefixAborted = true;
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const pUsers = client.fetchQuery(UsersPort, "x");
    const pPrefix = client.fetchQuery(UsersPrefixPort, "y");

    // Cancel only "Users" port — should NOT cancel "UsersPrefix"
    client.cancelQueries(UsersPort);

    expect(prefixAborted).toBe(false);
    const rPrefix = await pPrefix;
    expect(rPrefix.isOk()).toBe(true); // UsersPrefix should complete successfully

    const rUsers = await pUsers;
    expect(rUsers.isErr()).toBe(true); // Users should be cancelled

    client.dispose();
  });
});

describe("QueryClient decrementFetching boundary (targeted)", () => {
  it("decrementFetching removes key from map when count reaches 0", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });

    const p = client.fetchQuery(UsersPort, undefined);
    // During fetch, count should be 1
    expect(client.isFetching({ port: UsersPort })).toBe(1);

    await p;
    // After fetch, count goes to 0 — map entry deleted, returns 0
    expect(client.isFetching({ port: UsersPort })).toBe(0);
    client.dispose();
  });

  it("decrementFetching correctly decrements from 2 to 1", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["data"]), 30)),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const p1 = client.fetchQuery(UsersPort, "a");
    const p2 = client.fetchQuery(UsersPort, "b");
    expect(client.isFetching({ port: UsersPort })).toBe(2);

    await p1;
    expect(client.isFetching({ port: UsersPort })).toBe(1);

    await p2;
    expect(client.isFetching({ port: UsersPort })).toBe(0);
    client.dispose();
  });
});

describe("QueryClient mutation effects iteration (targeted)", () => {
  it("effects.invalidates iterates over all query ports", async () => {
    const PostsPort2 = createQueryPort<string[], unknown>()({ name: "PostsMutEffect" });
    const MultiEffect = createMutationPort<void, string, Error>()({
      name: "MultiEffect",
      effects: { invalidates: [UsersPort, PostsPort2] },
    });

    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    container.register(PostsPort2, () =>
      ResultAsync.fromPromise(Promise.resolve(["post"]), () => new Error("fail"))
    );
    container.register(MultiEffect, () =>
      ResultAsync.fromPromise(Promise.resolve(undefined), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    await client.fetchQuery(UsersPort, undefined);
    await client.fetchQuery(PostsPort2, undefined);

    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(false);
    expect(client.cache.get(PostsPort2, undefined)?.isInvalidated).toBe(false);

    await client.mutate(MultiEffect, "go");

    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(true);
    expect(client.cache.get(PostsPort2, undefined)?.isInvalidated).toBe(true);
    client.dispose();
  });
});

describe("QueryClient dispose cancels all (targeted)", () => {
  it("dispose aborts all in-flight cancellation controllers", async () => {
    const container = createTestContainer();
    container.register(UsersPort, robustAbortFetcher<string[]>());
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    const p = client.fetchQuery(UsersPort, "dispose-test");
    client.dispose();

    const result = await p;
    expect(result.isErr()).toBe(true);
    expect(client.isDisposed).toBe(true);
  });
});

describe("QueryClient isAbortError", () => {
  it("recognizes DOMException with name AbortError", async () => {
    const container = createTestContainer();
    container.register(UsersPort, (_params: unknown, ctx: any) =>
      ResultAsync.fromPromise(
        new Promise<string[]>((_resolve, reject) => {
          ctx.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
        e => e as Error
      )
    );
    const client = createQueryClient({ container });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    const p = client.fetchQuery(UsersPort, "abort-test");
    client.cancelQueries(UsersPort, "abort-test");
    const result = await p;

    expect(result.isErr()).toBe(true);
    // The error should be recognized as AbortError and become QueryCancelled
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryCancelled");
    }

    const cancelled = events.find(e => e.type === "fetch-cancelled");
    expect(cancelled).toBeDefined();
    client.dispose();
  });

  it("does NOT treat non-AbortError DOMException as abort", async () => {
    // Test with a DOMException that is NOT an AbortError (e.g., SyntaxError)
    const SyntaxPort = createQueryPort<string[], unknown, Error>()({ name: "SyntaxDom" });
    const container = createTestContainer();
    container.register(SyntaxPort, () =>
      ResultAsync.fromPromise(Promise.reject(new DOMException("bad syntax", "SyntaxError")), e =>
        e instanceof Error ? e : new Error(String(e))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    const result = await client.fetchQuery(SyntaxPort, undefined);

    expect(result.isErr()).toBe(true);
    // Should NOT be treated as abort — should emit fetch-error, not fetch-cancelled
    const cancelled = events.find(e => e.type === "fetch-cancelled");
    expect(cancelled).toBeUndefined();
    const fetchError = events.find(e => e.type === "fetch-error");
    expect(fetchError).toBeDefined();

    client.dispose();
  });
});

// ===========================================================================
// Round 4: Targeted mutant-killing tests
// ===========================================================================

describe("QueryClient decrementFetching boundary (mutant-killing)", () => {
  it("isFetching returns 0 after single fetch completes (entry deleted, not set to 0)", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    // Before fetch
    expect(client.isFetching()).toBe(0);

    // Fetch and await
    await client.fetchQuery(UsersPort, undefined);

    // After fetch: decrement from 1 should delete the entry, not set to 0
    expect(client.isFetching()).toBe(0);
    expect(client.isFetching({ port: UsersPort })).toBe(0);

    client.dispose();
  });

  it("concurrent fetches decrement correctly to 0", async () => {
    const SlowPort = createQueryPort<string[], string, Error>()({ name: "SlowDec" });
    let resolvers: Array<(v: string[]) => void> = [];
    const container = createTestContainer();
    container.register(SlowPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => {
          resolvers.push(resolve);
        }),
        e => (e instanceof Error ? e : new Error(String(e)))
      )
    );
    const client = createQueryClient({ container, defaults: { staleTime: 0, retry: 0 } });

    // Start two concurrent fetches for different params
    const p1 = client.fetchQuery(SlowPort, "a");
    const p2 = client.fetchQuery(SlowPort, "b");

    expect(client.isFetching()).toBe(2);

    // Complete first
    resolvers[0](["a"]);
    await p1;
    expect(client.isFetching()).toBe(1);

    // Complete second
    resolvers[1](["b"]);
    await p2;
    expect(client.isFetching()).toBe(0);

    client.dispose();
  });
});

describe("QueryClient mutatingCount decrement (mutant-killing)", () => {
  it("isMutating returns 0 after mutation completes", async () => {
    const MutPort = createMutationPort<void, string, Error>()({
      name: "MutDec",
      effects: {},
    });
    const container = createTestContainer();
    container.register(MutPort, () => ResultAsync.ok(undefined));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    expect(client.isMutating()).toBe(0);
    await client.mutate(MutPort, "input");
    expect(client.isMutating()).toBe(0);

    client.dispose();
  });

  it("isMutating returns 0 after failed mutation", async () => {
    const FailMutPort = createMutationPort<void, string, Error>()({
      name: "FailMutDec",
      effects: {},
    });
    const container = createTestContainer();
    container.register(FailMutPort, () => ResultAsync.err(new Error("mutation failed")));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    expect(client.isMutating()).toBe(0);
    const result = await client.mutate(FailMutPort, "input");
    expect(result.isErr()).toBe(true);
    // mutatingCount-- must have run (not ++ or no-op)
    expect(client.isMutating()).toBe(0);

    client.dispose();
  });

  it("mutation error is preserved through narrowError (not undefined)", async () => {
    const ErrMutPort = createMutationPort<void, string, Error>()({
      name: "ErrPreserve",
      effects: {},
    });
    const container = createTestContainer();
    const expectedError = new Error("specific mutation error");
    container.register(ErrMutPort, () => ResultAsync.err(expectedError));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const result = await client.mutate(ErrMutPort, "input");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // narrowError must return the error (not undefined from empty body)
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe("specific mutation error");
    }

    client.dispose();
  });
});

describe("QueryClient ensureQueryData conditions (mutant-killing)", () => {
  it("ensureQueryData returns cached data without re-fetching", async () => {
    let fetchCount = 0;
    const EnsurePort = createQueryPort<string[], unknown, Error>()({ name: "Ensure" });
    const container = createTestContainer();
    container.register(EnsurePort, () => {
      fetchCount++;
      return ResultAsync.ok(["data"]);
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    await client.fetchQuery(EnsurePort, undefined);
    expect(fetchCount).toBe(1);

    // ensureQueryData should use cache, not fetch again
    const result = await client.ensureQueryData(EnsurePort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toEqual(["data"]);
    expect(fetchCount).toBe(1);

    client.dispose();
  });

  it("ensureQueryData fetches when data is undefined (pending entry)", async () => {
    let fetchCount = 0;
    const EnsurePort2 = createQueryPort<string[], unknown, Error>()({ name: "EnsurePend" });
    const container = createTestContainer();
    container.register(EnsurePort2, () => {
      fetchCount++;
      return ResultAsync.ok(["fresh"]);
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    // Create pending entry (no data)
    client.cache.getOrCreate(EnsurePort2, undefined);

    const result = await client.ensureQueryData(EnsurePort2, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toEqual(["fresh"]);
    expect(fetchCount).toBe(1);

    client.dispose();
  });

  it("ensureQueryData fetches when entry is invalidated", async () => {
    let fetchCount = 0;
    const EnsurePort3 = createQueryPort<string[], unknown, Error>()({ name: "EnsureInv" });
    const container = createTestContainer();
    container.register(EnsurePort3, () => {
      fetchCount++;
      return ResultAsync.ok(["data-" + fetchCount]);
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    await client.fetchQuery(EnsurePort3, undefined);
    expect(fetchCount).toBe(1);

    await client.invalidateQueries(EnsurePort3);

    // ensureQueryData should re-fetch because entry is invalidated
    const result = await client.ensureQueryData(EnsurePort3, undefined);
    expect(result.isOk()).toBe(true);
    expect(fetchCount).toBe(2);

    client.dispose();
  });
});

describe("QueryClient dispose guard (mutant-killing)", () => {
  it("double dispose does not throw", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    client.dispose();
    expect(() => client.dispose()).not.toThrow();
  });

  it("operations after dispose return error (disposed guard active)", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    client.dispose();

    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryDisposed");
    }

    // Second call after dispose should also return error (not crash)
    const result2 = await client.fetchQuery(UsersPort, undefined);
    expect(result2.isErr()).toBe(true);
  });
});

describe("QueryClient structural sharing option (mutant-killing)", () => {
  it("structural sharing preserves reference in cache for equal data", async () => {
    const SharingPort = createQueryPort<{ a: number; b: number }, unknown, Error>()({
      name: "Sharing",
    });
    const container = createTestContainer();
    container.register(SharingPort, () => ResultAsync.ok({ a: 1, b: 2 }));
    const client = createQueryClient({
      container,
      defaults: { staleTime: 0, retry: 0, structuralSharing: true },
    });

    await client.fetchQuery(SharingPort, undefined);
    // Get reference from cache
    const data1 = client.getQueryData(SharingPort, undefined);

    // Invalidate and refetch with same data
    await client.invalidateQueries(SharingPort);
    await client.fetchQuery(SharingPort, undefined);
    const data2 = client.getQueryData(SharingPort, undefined);

    // With structural sharing ON, same-value objects should be reference-equal in cache
    expect(data1).toEqual(data2);
    expect(data1).toBe(data2);

    client.dispose();
  });

  it("structural sharing disabled returns new reference", async () => {
    const NoSharePort = createQueryPort<{ a: number; b: number }, unknown, Error>()({
      name: "NoShare",
      defaults: { structuralSharing: false },
    });
    const container = createTestContainer();
    container.register(NoSharePort, () => ResultAsync.ok({ a: 1, b: 2 }));
    const client = createQueryClient({
      container,
      defaults: { staleTime: 0, retry: 0, structuralSharing: true },
    });

    const r1 = await client.fetchQuery(NoSharePort, undefined);
    const data1 = r1.isOk() ? r1.value : null;

    await client.invalidateQueries(NoSharePort);
    const r2 = await client.fetchQuery(NoSharePort, undefined);
    const data2 = r2.isOk() ? r2.value : null;

    // With structural sharing OFF, should be different references
    expect(data1).toEqual(data2);
    expect(data1).not.toBe(data2);

    client.dispose();
  });
});

describe("QueryClient invalidateQueries refetch with observers (mutant-killing)", () => {
  it("refetches entries with observers when params undefined", async () => {
    let fetchCount = 0;
    const RefetchPort = createQueryPort<string[], unknown, Error>()({ name: "RefObs" });
    const container = createTestContainer();
    container.register(RefetchPort, () => {
      fetchCount++;
      return ResultAsync.ok(["v" + fetchCount]);
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    await client.fetchQuery(RefetchPort, undefined);
    expect(fetchCount).toBe(1);

    // Add observer
    client.cache.incrementObservers(RefetchPort, undefined);

    // Invalidate without params → should refetch because observer > 0
    await client.invalidateQueries(RefetchPort);
    expect(fetchCount).toBe(2);

    client.cache.decrementObservers(RefetchPort, undefined);
    client.dispose();
  });

  it("does NOT refetch entries without observers when params undefined", async () => {
    let fetchCount = 0;
    const NoRefetchPort = createQueryPort<string[], unknown, Error>()({ name: "NoRefObs" });
    const container = createTestContainer();
    container.register(NoRefetchPort, () => {
      fetchCount++;
      return ResultAsync.ok(["v" + fetchCount]);
    });
    const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });

    await client.fetchQuery(NoRefetchPort, undefined);
    expect(fetchCount).toBe(1);

    // No observer added
    await client.invalidateQueries(NoRefetchPort);
    // Should NOT refetch (observerCount = 0 is filtered out)
    expect(fetchCount).toBe(1);

    client.dispose();
  });
});

// ===========================================================================
// Round 5: Targeted mutant-killing tests
// ===========================================================================

describe("QueryClient deduplicated event boundary (mutant-killing)", () => {
  it("single (non-deduplicated) fetch does NOT emit 'deduplicated' event", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container, defaults: { staleTime: 0, retry: 0 } });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, "first-fetch");

    const dedupEvents = events.filter(e => e.type === "deduplicated");
    expect(dedupEvents.length).toBe(0);
    client.dispose();
  });

  it("concurrent fetch for same key emits 'deduplicated' event", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => setTimeout(() => resolve(["data"]), 10)),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container, defaults: { staleTime: 0, retry: 0 } });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    const p1 = client.fetchQuery(UsersPort, "dedup-key");
    const p2 = client.fetchQuery(UsersPort, "dedup-key");
    await Promise.all([p1, p2]);

    const dedupEvents = events.filter(e => e.type === "deduplicated");
    expect(dedupEvents.length).toBe(1);
    client.dispose();
  });
});

describe("QueryClient fetch-error durationMs (mutant-killing)", () => {
  it("fetch-error durationMs is clock.now() - startTime, not sum", async () => {
    let now = 1000;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      now = 1050; // Simulate 50ms elapsed
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    });
    const client = createQueryClient({
      container,
      clock: { now: () => now },
      defaults: { retry: 0 },
    });

    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(e => events.push(e));

    await client.fetchQuery(UsersPort, undefined);

    const errorEvent = events.find(e => e.type === "fetch-error");
    expect(errorEvent).toBeDefined();
    if (errorEvent?.type === "fetch-error") {
      // With correct code: 1050 - 1000 = 50
      // With mutation (+ instead of -): 1050 + 1000 = 2050
      expect(errorEvent.durationMs).toBe(50);
    }
    client.dispose();
  });
});

describe("QueryClient mutation adapter missing (mutant-killing)", () => {
  it("mutate returns QueryAdapterMissing when no mutation adapter registered", async () => {
    const UnregMutPort = createMutationPort<string, string, Error>()({
      name: "UnregisteredMut",
    });
    const container = createTestContainer();
    const client = createQueryClient({ container });

    const result = await client.mutate(UnregMutPort, "input");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryAdapterMissing");
    }
    client.dispose();
  });

  it("mutate on disposed client returns QueryDisposed error", async () => {
    const MutPort = createMutationPort<string, string, Error>()({
      name: "DisposedMut",
    });
    const container = createTestContainer();
    container.register(MutPort, () => ResultAsync.ok("ok"));
    const client = createQueryClient({ container });
    client.dispose();

    const result = await client.mutate(MutPort, "input");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryDisposed");
    }
  });
});

describe("QueryClient mutation context signal/meta (mutant-killing)", () => {
  it("executor receives signal in context", async () => {
    let receivedSignal: AbortSignal | undefined;
    const SigMutPort = createMutationPort<string, string, Error>()({
      name: "SigMut",
    });
    const container = createTestContainer();
    container.register(SigMutPort, (_input: string, ctx: any) => {
      receivedSignal = ctx.signal;
      return ResultAsync.ok("ok");
    });
    const client = createQueryClient({ container });

    await client.mutate(SigMutPort, "test");
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    client.dispose();
  });

  it("executor receives meta from options", async () => {
    let receivedMeta: unknown;
    const MetaMutPort = createMutationPort<string, string, Error>()({
      name: "MetaMut",
    });
    const container = createTestContainer();
    container.register(MetaMutPort, (_input: string, ctx: any) => {
      receivedMeta = ctx.meta;
      return ResultAsync.ok("ok");
    });
    const client = createQueryClient({ container });

    await client.mutate(MetaMutPort, "test", { meta: { traceId: "abc-123" } });
    expect(receivedMeta).toEqual({ traceId: "abc-123" });
    client.dispose();
  });

  it("executor receives undefined meta when not provided", async () => {
    let receivedMeta: unknown = "sentinel";
    const NoMetaMutPort = createMutationPort<string, string, Error>()({
      name: "NoMetaMut",
    });
    const container = createTestContainer();
    container.register(NoMetaMutPort, (_input: string, ctx: any) => {
      receivedMeta = ctx.meta;
      return ResultAsync.ok("ok");
    });
    const client = createQueryClient({ container });

    await client.mutate(NoMetaMutPort, "test");
    expect(receivedMeta).toBeUndefined();
    client.dispose();
  });
});

// =============================================================================
// cancelQueries params isolation (mutant-killing: line 564)
// =============================================================================

describe("QueryClient cancelQueries params isolation (mutant-killing)", () => {
  it("cancelQueries(port, params) cancels only that key, not other params of same port", async () => {
    const container = createTestContainer();
    let p2Aborted = false;
    container.register(UsersPort, (_params: unknown, ctx: any) =>
      ResultAsync.fromPromise(
        new Promise<string[]>((resolve, reject) => {
          const timer = setTimeout(() => resolve(["data"]), 50);
          ctx.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            if (_params === "p2") p2Aborted = true;
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    const fetchP1 = client.fetchQuery(UsersPort, "p1");
    const fetchP2 = client.fetchQuery(UsersPort, "p2");

    // Cancel only p1 — p2 should NOT be cancelled
    client.cancelQueries(UsersPort, "p1");

    const r1 = await fetchP1;
    expect(r1.isErr()).toBe(true); // p1 was cancelled

    expect(p2Aborted).toBe(false); // p2 was NOT aborted

    const r2 = await fetchP2;
    expect(r2.isOk()).toBe(true); // p2 completed normally

    client.dispose();
  });
});
