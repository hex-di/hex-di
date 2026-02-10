/**
 * E2E: Async Derived
 *
 * Full end-to-end tests for async derived ports using real
 * GraphBuilder + createContainer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createAsyncDerivedPort, createAsyncDerivedAdapter } from "../../src/index.js";

import { ResultAsync } from "@hex-di/result";

// =============================================================================
// E2E Tests
// =============================================================================

describe("E2E: Async Derived", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exchange rate transitions idle → loading → success", async () => {
    const ExchangeRatePort = createAsyncDerivedPort<number, unknown>()({
      name: "ExchangeRate",
    });

    let resolvePromise: ((value: number) => void) | undefined;
    const adapter = createAsyncDerivedAdapter({
      provides: ExchangeRatePort,
      requires: [],
      select: () =>
        ResultAsync.fromPromise(
          new Promise<number>(resolve => {
            resolvePromise = resolve;
          }),
          e => e
        ),
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "e2e-async" });

    const service = container.resolve(ExchangeRatePort);

    // After resolution, the adapter kicks off initial fetch → loading
    expect(service.snapshot.status).toBe("loading");

    // Resolve the async fetch
    resolvePromise?.(1.42);
    await vi.advanceTimersByTimeAsync(0);

    expect(service.snapshot.status).toBe("success");
    expect(service.snapshot.data).toBe(1.42);

    await container.dispose();
  });

  it("error path with retry exhaustion", async () => {
    const FailPort = createAsyncDerivedPort<string, unknown>()({
      name: "Failing",
    });

    let attempt = 0;
    const adapter = createAsyncDerivedAdapter({
      provides: FailPort,
      requires: [],
      select: () => {
        attempt++;
        return ResultAsync.fromPromise(
          Promise.reject<string>(new Error(`fail-${attempt}`)),
          e => e
        );
      },
      retryCount: 2,
      retryDelay: 10,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "e2e-async-error" });

    const service = container.resolve(FailPort);
    expect(service.snapshot.status).toBe("loading");

    // Let retries execute
    await vi.advanceTimersByTimeAsync(100);

    expect(service.snapshot.status).toBe("error");
    expect(attempt).toBe(3); // 1 initial + 2 retries

    await container.dispose();
  });

  it("refresh triggers re-fetch", async () => {
    const DataPort = createAsyncDerivedPort<string, unknown>()({
      name: "Data",
    });

    let fetchCount = 0;
    const adapter = createAsyncDerivedAdapter({
      provides: DataPort,
      requires: [],
      select: () => {
        fetchCount++;
        return ResultAsync.fromPromise(Promise.resolve(`data-${fetchCount}`), e => e);
      },
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "e2e-async-refresh" });

    const service = container.resolve(DataPort);

    // Initial fetch
    await vi.advanceTimersByTimeAsync(0);
    expect(service.snapshot.status).toBe("success");
    expect(service.snapshot.data).toBe("data-1");
    expect(fetchCount).toBe(1);

    // Trigger refresh
    service.refresh();
    await vi.advanceTimersByTimeAsync(0);

    expect(service.snapshot.data).toBe("data-2");
    expect(fetchCount).toBe(2);

    await container.dispose();
  });
});
