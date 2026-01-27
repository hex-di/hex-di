/**
 * Type-level tests for intra-batch collision detection.
 *
 * These tests verify that `provideMany()` correctly detects duplicate
 * adapters WITHIN a single batch, not just batch-vs-graph duplicates.
 */
import { expectTypeOf, describe, it } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  createAdapter,
  GraphBuilder,
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<"Logger", { log: (msg: string) => void }>("Logger");
const DatabasePort = createPort<"Database", { query: () => string }>("Database");
const CachePort = createPort<"Cache", { get: (key: string) => string }>("Cache");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

// Second adapter that also provides LoggerPort (duplicate)
const LoggerAdapter2 = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  lifetime: "scoped",
  factory: () => ({ query: () => "result" }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [] as const,
  lifetime: "transient",
  factory: () => ({ get: () => "value" }),
});

// =============================================================================
// HasDuplicatesInBatch Tests
// =============================================================================

describe("HasDuplicatesInBatch", () => {
  it("returns false for empty array", () => {
    expectTypeOf<HasDuplicatesInBatch<readonly []>>().toEqualTypeOf<false>();
  });

  it("returns false for single adapter", () => {
    expectTypeOf<HasDuplicatesInBatch<readonly [typeof LoggerAdapter]>>().toEqualTypeOf<false>();
  });

  it("returns false for unique adapters", () => {
    expectTypeOf<
      HasDuplicatesInBatch<readonly [typeof LoggerAdapter, typeof DatabaseAdapter]>
    >().toEqualTypeOf<false>();
  });

  it("returns false for three unique adapters", () => {
    expectTypeOf<
      HasDuplicatesInBatch<
        readonly [typeof LoggerAdapter, typeof DatabaseAdapter, typeof CacheAdapter]
      >
    >().toEqualTypeOf<false>();
  });

  it("returns true when same port provided twice (adjacent)", () => {
    expectTypeOf<
      HasDuplicatesInBatch<readonly [typeof LoggerAdapter, typeof LoggerAdapter2]>
    >().toEqualTypeOf<true>();
  });

  it("returns true when duplicate is not adjacent", () => {
    expectTypeOf<
      HasDuplicatesInBatch<
        readonly [typeof LoggerAdapter, typeof DatabaseAdapter, typeof LoggerAdapter2]
      >
    >().toEqualTypeOf<true>();
  });

  it("returns true when duplicate is at the end", () => {
    expectTypeOf<
      HasDuplicatesInBatch<
        readonly [typeof DatabaseAdapter, typeof LoggerAdapter, typeof LoggerAdapter2]
      >
    >().toEqualTypeOf<true>();
  });
});

// =============================================================================
// FindBatchDuplicate Tests
// =============================================================================

describe("FindBatchDuplicate", () => {
  it("returns never for empty array", () => {
    expectTypeOf<FindBatchDuplicate<readonly []>>().toEqualTypeOf<never>();
  });

  it("returns never for single adapter", () => {
    expectTypeOf<FindBatchDuplicate<readonly [typeof LoggerAdapter]>>().toEqualTypeOf<never>();
  });

  it("returns never for unique adapters", () => {
    expectTypeOf<
      FindBatchDuplicate<readonly [typeof LoggerAdapter, typeof DatabaseAdapter]>
    >().toEqualTypeOf<never>();
  });

  it("returns duplicated port for batch with duplicates", () => {
    type Result = FindBatchDuplicate<readonly [typeof LoggerAdapter, typeof LoggerAdapter2]>;
    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("returns first duplicated port when multiple duplicates exist", () => {
    // Logger appears first as a duplicate
    type Result = FindBatchDuplicate<
      readonly [typeof LoggerAdapter, typeof DatabaseAdapter, typeof LoggerAdapter2]
    >;
    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
  });
});

// =============================================================================
// BatchDuplicateErrorMessage Tests
// =============================================================================

describe("BatchDuplicateErrorMessage", () => {
  it("formats error message with port name", () => {
    type Msg = BatchDuplicateErrorMessage<typeof LoggerPort>;
    expectTypeOf<Msg>().toEqualTypeOf<"ERROR[HEX001]: Duplicate adapter in batch for 'Logger'. Fix: Remove one adapter from the provideMany() array.">();
  });
});

// =============================================================================
// provideMany Integration Tests
// =============================================================================

describe("provideMany with intra-batch duplicates", () => {
  it("detects duplicate adapters within batch", () => {
    const builder = GraphBuilder.create();
    type Result = ReturnType<
      typeof builder.provideMany<readonly [typeof LoggerAdapter, typeof LoggerAdapter2]>
    >;

    // Should be an error message, not a GraphBuilder
    expectTypeOf<Result>().toEqualTypeOf<"ERROR[HEX001]: Duplicate adapter in batch for 'Logger'. Fix: Remove one adapter from the provideMany() array.">();
  });

  it("allows unique adapters in batch", () => {
    const builder = GraphBuilder.create();
    const result = builder.provideMany([LoggerAdapter, DatabaseAdapter, CacheAdapter] as const);

    // Should be a valid GraphBuilder (accessing $provides verifies it's a builder)
    expectTypeOf<typeof result.$provides>().toEqualTypeOf<
      typeof LoggerPort | typeof DatabasePort | typeof CachePort
    >();
  });

  it("detects batch-vs-graph duplicates (existing behavior)", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    type Result = ReturnType<
      typeof builder.provideMany<readonly [typeof DatabaseAdapter, typeof LoggerAdapter2]>
    >;

    // This should be caught by the batch-vs-graph check
    expectTypeOf<Result>().toEqualTypeOf<"ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs.">();
  });

  it("detects intra-batch before batch-vs-graph when both exist", () => {
    // When there's both an intra-batch duplicate AND a batch-vs-graph duplicate,
    // intra-batch should be reported first (step 0 before step 1)
    const builder = GraphBuilder.create().provide(CacheAdapter);
    type Result = ReturnType<
      typeof builder.provideMany<readonly [typeof LoggerAdapter, typeof LoggerAdapter2]>
    >;

    // Intra-batch error should win
    expectTypeOf<Result>().toEqualTypeOf<"ERROR[HEX001]: Duplicate adapter in batch for 'Logger'. Fix: Remove one adapter from the provideMany() array.">();
  });
});
