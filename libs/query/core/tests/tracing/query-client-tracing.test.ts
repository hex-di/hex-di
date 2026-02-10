/**
 * QueryClient Tracing Integration Tests
 *
 * Tests that the QueryClient correctly calls tracingHook callbacks
 * during fetch and mutation lifecycles.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryClient, createQueryPort, createMutationPort } from "../../src/index.js";
import type { QueryTracingHook } from "../../src/tracing/types.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Helpers
// =============================================================================

interface TracingCall {
  readonly method: string;
  readonly args: unknown[];
}

function createMockTracingHook(): QueryTracingHook & { calls: TracingCall[] } {
  const calls: TracingCall[] = [];
  return {
    calls,
    onFetchStart(portName, params, attrs) {
      calls.push({ method: "onFetchStart", args: [portName, params, attrs] });
    },
    onFetchEnd(portName, ok) {
      calls.push({ method: "onFetchEnd", args: [portName, ok] });
    },
    onMutationStart(portName, input, attrs) {
      calls.push({ method: "onMutationStart", args: [portName, input, attrs] });
    },
    onMutationEnd(portName, ok) {
      calls.push({ method: "onMutationEnd", args: [portName, ok] });
    },
  };
}

const UsersPort = createQueryPort<string[], { id: number }>()({ name: "Users" });
const SimplePort = createQueryPort<string[], unknown>()({ name: "Simple", defaults: { retry: 0 } });

const CreateUserPort = createMutationPort<{ id: number }, { name: string }, Error>()({
  name: "CreateUser",
});

function createUsersFetcher(data: string[] = ["Alice", "Bob"]) {
  return () => ResultAsync.fromPromise(Promise.resolve(data), () => new Error("fail"));
}

function createFailingFetcher() {
  return () => ResultAsync.err(new Error("fetch-failed"));
}

function createMutationExecutor(result: { id: number } = { id: 1 }) {
  return () => ResultAsync.fromPromise(Promise.resolve(result), () => new Error("fail"));
}

function createFailingMutationExecutor() {
  return () => ResultAsync.err(new Error("mutation-failed"));
}

// =============================================================================
// Tests
// =============================================================================

describe("QueryClient tracing integration", () => {
  it("emits onFetchStart and onFetchEnd on successful fetch", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();
    container.register(SimplePort, createUsersFetcher());
    const client = createQueryClient({ container, tracingHook: hook });

    const result = await client.fetchQuery(SimplePort, undefined);
    expect(result.isOk()).toBe(true);

    const starts = hook.calls.filter(c => c.method === "onFetchStart");
    const ends = hook.calls.filter(c => c.method === "onFetchEnd");

    expect(starts).toHaveLength(1);
    expect(starts[0]?.args[0]).toBe("Simple");
    expect(ends).toHaveLength(1);
    expect(ends[0]?.args).toEqual(["Simple", true]);

    client.dispose();
  });

  it("emits onFetchEnd with ok=false on fetch error", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();
    container.register(SimplePort, createFailingFetcher());
    const client = createQueryClient({ container, tracingHook: hook });

    const result = await client.fetchQuery(SimplePort, undefined);
    expect(result.isErr()).toBe(true);

    const ends = hook.calls.filter(c => c.method === "onFetchEnd");
    expect(ends).toHaveLength(1);
    expect(ends[0]?.args).toEqual(["Simple", false]);

    client.dispose();
  });

  it("emits cache hit span on second fetch with fresh data", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({
      container,
      tracingHook: hook,
      defaults: { staleTime: 60000 },
    });

    // First fetch — network
    await client.fetchQuery(UsersPort, { id: 1 });
    // Second fetch — cache hit
    await client.fetchQuery(UsersPort, { id: 1 });

    const starts = hook.calls.filter(c => c.method === "onFetchStart");
    expect(starts).toHaveLength(2);

    // First fetch: cacheHit=false
    expect((starts[0]?.args[2] as any).cacheHit).toBe(false);
    // Second fetch: cacheHit=true
    expect((starts[1]?.args[2] as any).cacheHit).toBe(true);

    client.dispose();
  });

  it("dedup skips span for deduplicated request", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();

    let resolvePromise: ((v: string[]) => void) | undefined;
    container.register(SimplePort, () =>
      ResultAsync.fromPromise(
        new Promise<string[]>(resolve => {
          resolvePromise = resolve;
        }),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container, tracingHook: hook });

    // Start two concurrent fetches for the same key
    const p1 = client.fetchQuery(SimplePort, undefined);
    const p2 = client.fetchQuery(SimplePort, undefined);

    // Only 1 onFetchStart should have been recorded (the primary)
    const startsBeforeResolve = hook.calls.filter(c => c.method === "onFetchStart");
    expect(startsBeforeResolve).toHaveLength(1);

    resolvePromise?.(["data"]);
    await Promise.all([p1, p2]);

    // Still only 1 start span
    const starts = hook.calls.filter(c => c.method === "onFetchStart");
    expect(starts).toHaveLength(1);

    client.dispose();
  });

  it("emits onMutationStart and onMutationEnd on successful mutation", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();
    container.register(CreateUserPort, createMutationExecutor());
    const client = createQueryClient({ container, tracingHook: hook });

    const result = await client.mutate(CreateUserPort, { name: "Alice" });
    expect(result.isOk()).toBe(true);

    const starts = hook.calls.filter(c => c.method === "onMutationStart");
    const ends = hook.calls.filter(c => c.method === "onMutationEnd");

    expect(starts).toHaveLength(1);
    expect(starts[0]?.args[0]).toBe("CreateUser");
    expect(ends).toHaveLength(1);
    expect(ends[0]?.args).toEqual(["CreateUser", true]);

    client.dispose();
  });

  it("emits onMutationEnd with ok=false on mutation error", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();
    container.register(CreateUserPort, createFailingMutationExecutor());
    const client = createQueryClient({ container, tracingHook: hook });

    const result = await client.mutate(CreateUserPort, { name: "Alice" });
    expect(result.isErr()).toBe(true);

    const ends = hook.calls.filter(c => c.method === "onMutationEnd");
    expect(ends).toHaveLength(1);
    expect(ends[0]?.args).toEqual(["CreateUser", false]);

    client.dispose();
  });

  it("no tracing calls when tracingHook is not provided", async () => {
    const container = createTestContainer();
    container.register(SimplePort, createUsersFetcher());
    const client = createQueryClient({ container });

    // Should not throw - optional chaining handles undefined hook
    const result = await client.fetchQuery(SimplePort, undefined);
    expect(result.isOk()).toBe(true);

    client.dispose();
  });

  it("child client inherits tracingHook", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();
    container.register(SimplePort, createUsersFetcher());
    const parent = createQueryClient({ container, tracingHook: hook });

    const child = parent.createChild();
    await child.fetchQuery(SimplePort, undefined);

    const starts = hook.calls.filter(c => c.method === "onFetchStart");
    expect(starts).toHaveLength(1);
    expect(starts[0]?.args[0]).toBe("Simple");

    child.dispose();
    parent.dispose();
  });

  it("params are serialized in fetch span attributes", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container, tracingHook: hook });

    await client.fetchQuery(UsersPort, { id: 42 });

    const starts = hook.calls.filter(c => c.method === "onFetchStart");
    expect(starts).toHaveLength(1);
    // stableStringify produces deterministic JSON with sorted keys
    expect(starts[0]?.args[1]).toBe('{"id":42}');

    client.dispose();
  });

  it("input is serialized in mutation span attributes", async () => {
    const hook = createMockTracingHook();
    const container = createTestContainer();
    container.register(CreateUserPort, createMutationExecutor());
    const client = createQueryClient({ container, tracingHook: hook });

    await client.mutate(CreateUserPort, { name: "Bob" });

    const starts = hook.calls.filter(c => c.method === "onMutationStart");
    expect(starts).toHaveLength(1);
    expect(starts[0]?.args[1]).toBe('{"name":"Bob"}');

    client.dispose();
  });
});
