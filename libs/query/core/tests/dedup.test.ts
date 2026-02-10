import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";

// Import the deduplication module directly
import { createDeduplicationMap } from "../src/client/deduplication.js";

describe("DeduplicationMap", () => {
  it("getOrCreate returns existing in-flight result for same key", async () => {
    const dedup = createDeduplicationMap();
    let callCount = 0;
    const factory = () => {
      callCount++;
      return ResultAsync.fromPromise(
        new Promise<string>(resolve => setTimeout(() => resolve("data"), 50)),
        () => new Error("fail")
      );
    };

    const result1 = dedup.dedupe("key1", factory);
    const result2 = dedup.dedupe("key1", factory);

    // Should be the same promise
    const [r1, r2] = await Promise.all([result1, result2]);
    expect(callCount).toBe(1);
    expect(r1.isOk()).toBe(true);
    expect(r2.isOk()).toBe(true);
  });

  it("getOrCreate creates new result for absent key", async () => {
    const dedup = createDeduplicationMap();
    const result = dedup.dedupe("key1", () =>
      ResultAsync.fromPromise(Promise.resolve("data"), () => new Error("fail"))
    );
    const r = await result;
    expect(r.isOk()).toBe(true);
  });

  it("two concurrent requests for same key produce single fetch", async () => {
    const dedup = createDeduplicationMap();
    let fetchCount = 0;
    const factory = () => {
      fetchCount++;
      return ResultAsync.fromPromise(
        new Promise<string>(resolve => setTimeout(() => resolve("data"), 10)),
        () => new Error("fail")
      );
    };

    const p1 = dedup.dedupe("same-key", factory);
    const p2 = dedup.dedupe("same-key", factory);

    await Promise.all([p1, p2]);
    expect(fetchCount).toBe(1);
  });

  it("two requests for different keys produce separate fetches", async () => {
    const dedup = createDeduplicationMap();
    let fetchCount = 0;
    const factory = () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve("data"), () => new Error("fail"));
    };

    const p1 = dedup.dedupe("key-a", factory);
    const p2 = dedup.dedupe("key-b", factory);

    await Promise.all([p1, p2]);
    expect(fetchCount).toBe(2);
  });

  it("in-flight entry is removed on completion", async () => {
    const dedup = createDeduplicationMap();
    expect(dedup.size).toBe(0);

    const result = dedup.dedupe("key1", () =>
      ResultAsync.fromPromise(Promise.resolve("data"), () => new Error("fail"))
    );

    // During flight, size should be 1
    expect(dedup.size).toBe(1);

    await result;
    // After settlement, auto-cleanup should remove it
    // Allow microtask to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(dedup.size).toBe(0);
  });

  it("cancelAll aborts all in-flight requests", () => {
    const dedup = createDeduplicationMap();
    dedup.dedupe("key1", () =>
      ResultAsync.fromPromise(new Promise<string>(() => {}), () => new Error("fail"))
    );
    dedup.dedupe("key2", () =>
      ResultAsync.fromPromise(new Promise<string>(() => {}), () => new Error("fail"))
    );
    expect(dedup.size).toBe(2);
    dedup.cancelAll();
    expect(dedup.size).toBe(0);
  });

  it("size reflects count of in-flight requests", () => {
    const dedup = createDeduplicationMap();
    expect(dedup.size).toBe(0);

    dedup.dedupe("key1", () =>
      ResultAsync.fromPromise(new Promise<string>(() => {}), () => new Error("fail"))
    );
    expect(dedup.size).toBe(1);

    dedup.dedupe("key2", () =>
      ResultAsync.fromPromise(new Promise<string>(() => {}), () => new Error("fail"))
    );
    expect(dedup.size).toBe(2);

    dedup.cancelAll();
    expect(dedup.size).toBe(0);
  });

  it("error path cleanup: entry is removed after errored ResultAsync settles", async () => {
    const dedup = createDeduplicationMap();
    expect(dedup.size).toBe(0);

    const result = dedup.dedupe("err-key", () =>
      ResultAsync.fromPromise(Promise.reject(new Error("boom")), e => e as Error)
    );

    // During flight, size should be 1
    expect(dedup.size).toBe(1);

    const r = await result;
    expect(r.isErr()).toBe(true);

    // Allow microtask to complete for auto-cleanup via .mapErr()
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(dedup.size).toBe(0);
  });

  it("complete(serializedKey) manually removes entry and decreases size", async () => {
    const dedup = createDeduplicationMap();

    // Create a long-lived in-flight request that never resolves on its own
    dedup.dedupe("manual-key", () =>
      ResultAsync.fromPromise(new Promise<string>(() => {}), () => new Error("fail"))
    );
    expect(dedup.size).toBe(1);

    dedup.complete("manual-key");
    expect(dedup.size).toBe(0);
  });

  it("size correct after mixed completions (auto-settle + manual complete)", async () => {
    const dedup = createDeduplicationMap();

    // Key A: will auto-settle (resolves)
    const resultA = dedup.dedupe("key-a", () =>
      ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail"))
    );

    // Key B: long-lived, will be manually completed
    dedup.dedupe("key-b", () =>
      ResultAsync.fromPromise(new Promise<string>(() => {}), () => new Error("fail"))
    );

    // Key C: long-lived, will be manually completed
    dedup.dedupe("key-c", () =>
      ResultAsync.fromPromise(new Promise<string>(() => {}), () => new Error("fail"))
    );

    expect(dedup.size).toBe(3);

    // Wait for key-a to auto-settle
    await resultA;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(dedup.size).toBe(2);

    // Manually complete key-b
    dedup.complete("key-b");
    expect(dedup.size).toBe(1);

    // Manually complete key-c
    dedup.complete("key-c");
    expect(dedup.size).toBe(0);
  });
});
