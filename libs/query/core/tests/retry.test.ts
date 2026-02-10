import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { fetchWithRetry, type RetryConfig, DEFAULT_QUERY_OPTIONS } from "../src/index.js";

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("default retry: retries 3 times on failure", async () => {
    let attempts = 0;
    const fetcher = () => {
      attempts++;
      return ResultAsync.fromPromise(
        Promise.reject(new Error(`attempt ${attempts}`)),
        e => e as Error
      );
    };

    const config: RetryConfig = {
      retry: 3,
      retryDelay: 0,
    };

    const resultPromise = fetchWithRetry("TestPort", {}, fetcher, config);
    // Process all microtasks and timers
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result.isErr()).toBe(true);
    // 1 initial + 3 retries = 4 attempts
    expect(attempts).toBe(4);
  });

  it("retry: 0 disables retries", async () => {
    let attempts = 0;
    const fetcher = () => {
      attempts++;
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = { retry: 0, retryDelay: 0 };
    const result = await fetchWithRetry("TestPort", {}, fetcher, config);
    expect(result.isErr()).toBe(true);
    expect(attempts).toBe(1); // No retries
  });

  it("retry: false disables retries", async () => {
    let attempts = 0;
    const fetcher = () => {
      attempts++;
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = { retry: false, retryDelay: 0 };
    const result = await fetchWithRetry("TestPort", {}, fetcher, config);
    expect(result.isErr()).toBe(true);
    expect(attempts).toBe(1);
  });

  it("retry: true retries indefinitely (up to reasonable limit)", async () => {
    let attempts = 0;
    const fetcher = () => {
      attempts++;
      if (attempts >= 5) {
        return ResultAsync.fromPromise(Promise.resolve("success"), () => new Error("fail"));
      }
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = { retry: true, retryDelay: 0 };
    const resultPromise = fetchWithRetry("TestPort", {}, fetcher, config);
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result.isOk()).toBe(true);
    expect(attempts).toBe(5);
  });

  it("custom retry function receives failureCount and typed error", async () => {
    const receivedArgs: Array<{ count: number; error: unknown }> = [];
    const fetcher = () =>
      ResultAsync.fromPromise(Promise.reject(new Error("custom error")), e => e as Error);

    const config: RetryConfig = {
      retry: (failureCount, error) => {
        receivedArgs.push({ count: failureCount, error });
        return failureCount < 2;
      },
      retryDelay: 0,
    };

    const result = await fetchWithRetry("TestPort", {}, fetcher, config);
    expect(result.isErr()).toBe(true);
    expect(receivedArgs.length).toBe(3); // attempts 0, 1, 2 (stops at 2)
    expect(receivedArgs[0].count).toBe(0);
    expect(receivedArgs[1].count).toBe(1);
    expect(receivedArgs[2].count).toBe(2);
  });

  it("custom retry function returning false stops retries", async () => {
    let attempts = 0;
    const fetcher = () => {
      attempts++;
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = {
      retry: () => false,
      retryDelay: 0,
    };

    const result = await fetchWithRetry("TestPort", {}, fetcher, config);
    expect(result.isErr()).toBe(true);
    expect(attempts).toBe(1);
  });

  it("default retry delay: exponential backoff min(1000 * 2^attempt, 30000)", () => {
    const retryDelay = DEFAULT_QUERY_OPTIONS.retryDelay;
    expect(typeof retryDelay).toBe("function");
    if (typeof retryDelay === "function") {
      expect(retryDelay(0, new Error())).toBe(1000);
      expect(retryDelay(1, new Error())).toBe(2000);
      expect(retryDelay(2, new Error())).toBe(4000);
      expect(retryDelay(3, new Error())).toBe(8000);
      expect(retryDelay(4, new Error())).toBe(16000);
      expect(retryDelay(5, new Error())).toBe(30000); // Capped
      expect(retryDelay(10, new Error())).toBe(30000); // Capped
    }
  });

  it("attempt 0 delay is 1000ms", () => {
    const retryDelay = DEFAULT_QUERY_OPTIONS.retryDelay;
    if (typeof retryDelay === "function") {
      expect(retryDelay(0, new Error())).toBe(1000);
    }
  });

  it("attempt 1 delay is 2000ms", () => {
    const retryDelay = DEFAULT_QUERY_OPTIONS.retryDelay;
    if (typeof retryDelay === "function") {
      expect(retryDelay(1, new Error())).toBe(2000);
    }
  });

  it("attempt 2 delay is 4000ms", () => {
    const retryDelay = DEFAULT_QUERY_OPTIONS.retryDelay;
    if (typeof retryDelay === "function") {
      expect(retryDelay(2, new Error())).toBe(4000);
    }
  });

  it("attempt 3+ delay is capped at 30000ms", () => {
    const retryDelay = DEFAULT_QUERY_OPTIONS.retryDelay;
    if (typeof retryDelay === "function") {
      expect(retryDelay(5, new Error())).toBe(30000);
      expect(retryDelay(10, new Error())).toBe(30000);
    }
  });

  it("custom retry delay function receives attempt and typed error", async () => {
    const receivedArgs: Array<{ attempt: number; error: unknown }> = [];
    let attempts = 0;

    const fetcher = () => {
      attempts++;
      if (attempts >= 3) {
        return ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail"));
      }
      return ResultAsync.fromPromise(Promise.reject(new Error("custom")), e => e as Error);
    };

    const config: RetryConfig = {
      retry: 5,
      retryDelay: (attempt, error) => {
        receivedArgs.push({ attempt, error });
        return 0;
      },
    };

    await fetchWithRetry("TestPort", {}, fetcher, config);
    expect(receivedArgs.length).toBeGreaterThan(0);
    expect(receivedArgs[0].attempt).toBe(0);
  });

  it("retry is cancelled when query is cancelled", async () => {
    let attempts = 0;
    const controller = new AbortController();

    const fetcher = () => {
      attempts++;
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = {
      retry: 10,
      retryDelay: 5000, // Long delay between retries
    };

    const resultPromise = fetchWithRetry("TestPort", {}, fetcher, config, controller.signal);

    // Wait for first attempt
    await vi.advanceTimersByTimeAsync(0);
    // Cancel after first attempt
    controller.abort();

    try {
      const result = await resultPromise;
      // Either it's an error or it threw
      if (result.isErr()) {
        expect(attempts).toBeLessThanOrEqual(2);
      }
    } catch {
      // Expected -- abort rejects the delay promise
      expect(attempts).toBeLessThanOrEqual(2);
    }
  });

  it("retry: true keeps retrying until eventual success", async () => {
    let attempts = 0;
    const fetcher = () => {
      attempts++;
      if (attempts >= 8) {
        return ResultAsync.fromPromise(Promise.resolve("finally"), () => new Error("fail"));
      }
      return ResultAsync.fromPromise(Promise.reject(new Error("not yet")), e => e as Error);
    };

    const config: RetryConfig = { retry: true, retryDelay: 0 };
    const resultPromise = fetchWithRetry("TestPort", {}, fetcher, config);
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("finally");
    }
    expect(attempts).toBe(8);
  });

  it("numeric retryDelay is used as exact delay between retries", async () => {
    let attempts = 0;
    const fetcher = () => {
      attempts++;
      if (attempts >= 3) {
        return ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail"));
      }
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = { retry: 5, retryDelay: 42 };
    const resultPromise = fetchWithRetry("TestPort", {}, fetcher, config);

    // After first attempt fails, need to advance by 42ms for the delay
    await vi.advanceTimersByTimeAsync(0); // let first attempt run
    await vi.advanceTimersByTimeAsync(42); // first retry delay
    await vi.advanceTimersByTimeAsync(42); // second retry delay (attempt 3 succeeds)
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result.isOk()).toBe(true);
    expect(attempts).toBe(3);
  });

  it("retryDelay: 0 resolves immediately between retries", async () => {
    let attempts = 0;
    const fetcher = () => {
      attempts++;
      if (attempts >= 3) {
        return ResultAsync.fromPromise(Promise.resolve("quick"), () => new Error("fail"));
      }
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = { retry: 5, retryDelay: 0 };
    const resultPromise = fetchWithRetry("TestPort", {}, fetcher, config);
    // With 0ms delay, all retries should complete within microtasks
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result.isOk()).toBe(true);
    expect(attempts).toBe(3);
  });

  it("non-aborted signal allows retry to succeed after delay", async () => {
    // Kills mutation: `if (signal.aborted)` → `if (true)` in delay()
    // With mutation, delay() always rejects immediately, causing failure
    let attempts = 0;
    const controller = new AbortController(); // NOT aborted

    const fetcher = () => {
      attempts++;
      if (attempts >= 2) {
        return ResultAsync.fromPromise(Promise.resolve("success"), () => new Error("fail"));
      }
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = { retry: 3, retryDelay: 100 };
    const resultPromise = fetchWithRetry("TestPort", {}, fetcher, config, controller.signal);

    await vi.advanceTimersByTimeAsync(0); // first attempt
    await vi.advanceTimersByTimeAsync(100); // retry delay
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("success");
    }
    expect(attempts).toBe(2);
  });

  it("pre-aborted signal rejects immediately without retrying", async () => {
    let attempts = 0;
    const controller = new AbortController();
    controller.abort(new Error("pre-aborted"));

    const fetcher = () => {
      attempts++;
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e as Error);
    };

    const config: RetryConfig = { retry: 10, retryDelay: 5000 };
    const resultPromise = fetchWithRetry("TestPort", {}, fetcher, config, controller.signal);

    try {
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      // First attempt runs, then delay rejects because signal is already aborted
      if (result.isErr()) {
        expect(attempts).toBeLessThanOrEqual(1);
      }
    } catch {
      // Expected -- pre-aborted signal causes immediate rejection in delay()
      expect(attempts).toBeLessThanOrEqual(1);
    }
  });
});
