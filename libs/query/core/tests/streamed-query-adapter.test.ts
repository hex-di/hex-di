import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createStreamedQueryAdapter, createQueryPort, createQueryClient } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const TokensPort = createQueryPort<string, void, Error>()({ name: "Tokens" });
const EventsPort = createQueryPort<string[], { topic: string }, Error>()({ name: "Events" });

// =============================================================================
// Helpers
// =============================================================================

async function* asyncChunks<T>(items: ReadonlyArray<T>): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("createStreamedQueryAdapter", () => {
  it("returns an Adapter with streamed fetcher", () => {
    const adapter = createStreamedQueryAdapter(TokensPort, {
      factory: () => () =>
        ResultAsync.ok({
          stream: asyncChunks(["a", "b", "c"]),
          reducer: (acc: string, chunk: string) => acc + chunk,
          initialValue: "",
        }),
    });

    expect(adapter).toBeDefined();
    expect(adapter.provides).toBe(TokensPort);
    expect(adapter.requires).toEqual([]);
    expect(adapter.lifetime).toBe("singleton");
    expect(typeof adapter.factory).toBe("function");
  });

  it("streamed fetcher consumes stream and returns reduced value", async () => {
    const container = createTestContainer();

    const adapter = createStreamedQueryAdapter(TokensPort, {
      factory: () => () =>
        ResultAsync.ok({
          stream: asyncChunks(["a", "b", "c"]),
          reducer: (acc: string, chunk: string) => acc + chunk,
          initialValue: "",
        }),
    });

    // Resolve the wrapped fetcher and call it via the client
    const fetcher = (adapter.factory as () => unknown)();
    container.register(TokensPort, fetcher);
    const client = createQueryClient({ container });

    const result = await client.fetchQuery(TokensPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("abc");
    }

    client.dispose();
  });

  it("streamed fetcher works when refetchMode is omitted", async () => {
    const container = createTestContainer();

    const adapter = createStreamedQueryAdapter(TokensPort, {
      factory: () => () =>
        ResultAsync.ok({
          stream: asyncChunks(["x"]),
          reducer: (acc: string, chunk: string) => acc + chunk,
          initialValue: "",
          // refetchMode intentionally omitted
        }),
    });

    const fetcher = (adapter.factory as () => unknown)();
    container.register(TokensPort, fetcher);
    const client = createQueryClient({ container });

    const result = await client.fetchQuery(TokensPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("x");
    }

    client.dispose();
  });

  it("adapter with requires receives resolved dependencies", () => {
    const DepPort = createQueryPort<string, void>()({ name: "Dep" });

    const adapter = createStreamedQueryAdapter(EventsPort, {
      requires: [DepPort],
      factory: _deps => (params: { topic: string }) =>
        ResultAsync.ok({
          stream: asyncChunks([`event-${params.topic}`]),
          reducer: (acc: string[], chunk: string) => [...acc, chunk],
          initialValue: [] as string[],
        }),
    });

    expect(adapter.requires).toEqual([DepPort]);
  });

  it("custom lifetime is preserved", () => {
    const adapter = createStreamedQueryAdapter(TokensPort, {
      factory: () => () =>
        ResultAsync.ok({
          stream: asyncChunks(["a"]),
          reducer: (acc: string, chunk: string) => acc + chunk,
          initialValue: "",
        }),
      lifetime: "transient",
    });

    expect(adapter.lifetime).toBe("transient");
  });

  it("propagates errors from stream setup", async () => {
    const container = createTestContainer();

    const adapter = createStreamedQueryAdapter(TokensPort, {
      factory: () => () => ResultAsync.err(new Error("stream init failed")),
    });

    const fetcher = (adapter.factory as () => unknown)();
    container.register(TokensPort, fetcher);
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const result = await client.fetchQuery(TokensPort, undefined);
    expect(result.isErr()).toBe(true);

    client.dispose();
  });
});
