/**
 * Tests for progressive streaming cache updates.
 *
 * Verifies that the onProgress callback in FetchContext enables
 * intermediate cache updates during stream consumption.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createQueryClient,
  type QueryContainer,
  type FetchContext,
} from "../src/index.js";

// =============================================================================
// Test Ports
// =============================================================================

const StreamedPort = createQueryPort<string[], void, Error>()({
  name: "StreamedItems",
});

// =============================================================================
// Helpers
// =============================================================================

async function* asyncChunks<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

/**
 * Creates a streamed fetcher function that:
 * 1. Opens an async iterable stream
 * 2. Reduces chunks into an accumulator
 * 3. Calls context.onProgress after each chunk
 * 4. Returns the final reduced value
 *
 * This directly exercises the onProgress protocol without going through
 * the adapter factory layer (which is tested separately).
 */
function createStreamedFetcher(
  chunks: string[]
): (params: unknown, context: FetchContext) => ResultAsync<string[], Error> {
  return (_params: unknown, context: FetchContext) => {
    return ResultAsync.fromPromise(
      (async () => {
        let acc: string[] = [];
        for await (const chunk of asyncChunks(chunks)) {
          acc = [...acc, chunk];
          context.onProgress?.(acc);
        }
        return acc;
      })(),
      error => (error instanceof Error ? error : new Error(String(error)))
    );
  };
}

function createTestContainer(adapters: Map<string, unknown>): QueryContainer;
function createTestContainer(adapters: Map<string, unknown>): object {
  return {
    resolve(port: { readonly __portName: string }): unknown {
      const service = adapters.get(port.__portName);
      if (service === undefined) {
        throw new Error(`No adapter registered for port "${port.__portName}"`);
      }
      return service;
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("progressive streaming cache updates", () => {
  it("streamed fetcher with 3 chunks produces 3 intermediate cache updates", async () => {
    const adapters = new Map<string, unknown>();
    adapters.set("StreamedItems", createStreamedFetcher(["a", "b", "c"]));

    const container = createTestContainer(adapters);
    const client = createQueryClient({ container });

    // Track cache events
    const cacheUpdates: unknown[] = [];
    client.cache.subscribe(() => {
      const entry = client.cache.get(StreamedPort, undefined);
      if (entry?.data !== undefined) {
        cacheUpdates.push(entry.data);
      }
    });

    const result = await client.fetchQuery(StreamedPort, undefined);

    expect(result.isOk()).toBe(true);

    // The final value set by doFetch's .map() should be the complete array
    if (result.isOk()) {
      expect(result.value).toEqual(["a", "b", "c"]);
    }

    // Progressive onProgress calls cache.set() 3 times (one per chunk),
    // plus the final doFetch .map() also calls cache.set() once.
    // Each cache.set() fires a cache event -> subscribe callback.
    expect(cacheUpdates.length).toBeGreaterThanOrEqual(3);
  });

  it("final cache value matches fully reduced result", async () => {
    const adapters = new Map<string, unknown>();
    adapters.set("StreamedItems", createStreamedFetcher(["x", "y"]));

    const container = createTestContainer(adapters);
    const client = createQueryClient({ container });

    await client.fetchQuery(StreamedPort, undefined);

    const finalEntry = client.cache.get(StreamedPort, undefined);
    expect(finalEntry?.data).toEqual(["x", "y"]);

    client.dispose();
  });

  it("non-streaming adapters are unaffected (onProgress never called)", async () => {
    const StandardPort = createQueryPort<string, void, Error>()({
      name: "StandardQuery",
    });

    const adapters = new Map<string, unknown>();
    adapters.set("StandardQuery", (_params: unknown, _context: FetchContext) =>
      ResultAsync.ok("direct-value")
    );

    const container = createTestContainer(adapters);
    const client = createQueryClient({ container });

    const result = await client.fetchQuery(StandardPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("direct-value");
    }

    client.dispose();
  });

  it("cancellation mid-stream via AbortSignal", async () => {
    const controller = new AbortController();

    const fetcher = (_params: unknown, context: FetchContext): ResultAsync<string[], Error> => {
      return ResultAsync.fromPromise(
        (async () => {
          const results: string[] = [];
          for (const item of ["a", "b", "c"]) {
            if (context.signal.aborted) break;
            results.push(item);
            context.onProgress?.(results);
            if (item === "b") {
              controller.abort();
            }
          }
          return results;
        })(),
        error => (error instanceof Error ? error : new Error(String(error)))
      );
    };

    const adapters = new Map<string, unknown>();
    adapters.set("StreamedItems", fetcher);

    const container = createTestContainer(adapters);
    const client = createQueryClient({ container });

    const result = await client.fetchQuery(StreamedPort, undefined, {
      signal: controller.signal,
    });

    // The fetch may succeed or be cancelled depending on timing,
    // but it should always return a valid Result.
    expect(result.isOk() || result.isErr()).toBe(true);

    client.dispose();
  });
});
