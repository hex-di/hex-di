// @traces BEH-R02-001 INV-R1 INV-R2 INV-R3 INV-R7 INV-R8
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { useResultAsync } from "../../../src/hooks/use-result-async.js";

describe("useResultAsync (BEH-R02-001)", () => {
  it("starts isLoading=true, result=undefined", () => {
    const { result } = renderHook(() =>
      useResultAsync(() => ResultAsync.ok("hello"), []),
    );
    expect(result.current.isLoading).toBe(true);
    expect(result.current.result).toBeUndefined();
  });

  it("resolves to Ok result, isLoading=false", async () => {
    const { result } = renderHook(() =>
      useResultAsync(() => ResultAsync.ok(42), []),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeOk(42);
  });

  it("resolves to Err result", async () => {
    const { result } = renderHook(() =>
      useResultAsync(() => ResultAsync.err("fail"), []),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeErr("fail");
  });

  it("aborts signal on unmount (INV-R2)", async () => {
    let capturedSignal: AbortSignal | null = null;

    const { unmount } = renderHook(() =>
      useResultAsync(
        (signal) => {
          capturedSignal = signal;
          return ResultAsync.fromPromise(
            new Promise(() => {}), // never resolves
            () => "error",
          );
        },
        [],
      ),
    );

    await waitFor(() => {
      expect(capturedSignal).not.toBeNull();
    });
    expect(capturedSignal!.aborted).toBe(false);

    unmount();
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("aborts signal on deps change (INV-R2)", async () => {
    let capturedSignals: AbortSignal[] = [];

    const { rerender } = renderHook(
      ({ dep }: { dep: number }) =>
        useResultAsync(
          (signal) => {
            capturedSignals.push(signal);
            return ResultAsync.ok(dep);
          },
          [dep],
        ),
      { initialProps: { dep: 1 } },
    );

    await waitFor(() => {
      expect(capturedSignals.length).toBeGreaterThanOrEqual(1);
    });

    rerender({ dep: 2 });

    await waitFor(() => {
      expect(capturedSignals.length).toBeGreaterThanOrEqual(2);
    });
    // First signal should be aborted
    expect(capturedSignals[0].aborted).toBe(true);
  });

  it("stale response discarded (INV-R3)", async () => {
    let resolvers: Array<(v: string) => void> = [];

    const { result, rerender } = renderHook(
      ({ dep }: { dep: number }) =>
        useResultAsync(
          () =>
            ResultAsync.fromSafePromise(
              new Promise<string>((resolve) => {
                resolvers.push(resolve);
              }),
            ),
          [dep],
        ),
      { initialProps: { dep: 1 } },
    );

    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThanOrEqual(1);
    });

    // Change deps before first resolves
    rerender({ dep: 2 });

    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThanOrEqual(2);
    });

    // Resolve stale first, then current
    resolvers[0]("stale");
    resolvers[1]("fresh");

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeOk("fresh");
  });

  it("refetch re-executes", async () => {
    let callCount = 0;

    const { result } = renderHook(() =>
      useResultAsync(() => {
        callCount++;
        return ResultAsync.ok(callCount);
      }, []),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeOk(1);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.result).toBeOk();
      // Check that ok value is > 1 (was re-called)
      if (result.current.result?._tag === "Ok") {
        expect(result.current.result.value).toBeGreaterThan(1);
      }
    });
  });

  it("refetch referentially stable (INV-R1)", () => {
    const { result, rerender } = renderHook(() =>
      useResultAsync(() => ResultAsync.ok(1), []),
    );
    const firstRefetch = result.current.refetch;
    rerender();
    expect(result.current.refetch).toBe(firstRefetch);
  });

  it("retries on Err when retry > 0", async () => {
    let attempt = 0;

    const { result } = renderHook(() =>
      useResultAsync(
        () => {
          attempt++;
          if (attempt < 3) return ResultAsync.err("not yet");
          return ResultAsync.ok("done");
        },
        [],
        { retry: 3, retryDelay: 10 },
      ),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeOk("done");
    expect(attempt).toBe(3);
  });

  it("retry respects retryOn predicate", async () => {
    let attempt = 0;

    const { result } = renderHook(() =>
      useResultAsync(
        () => {
          attempt++;
          return ResultAsync.err({ retryable: attempt === 1 });
        },
        [],
        {
          retry: 5,
          retryDelay: 10,
          retryOn: (e) => e.retryable,
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    // Should have tried twice: first (retryable=true), second (retryable=false, stop)
    expect(attempt).toBe(2);
  });

  it("abort cancels pending retries (INV-R8)", async () => {
    let attempt = 0;

    const { unmount } = renderHook(() =>
      useResultAsync(
        () => {
          attempt++;
          return ResultAsync.err("fail");
        },
        [],
        { retry: 100, retryDelay: 50 },
      ),
    );

    // Wait for first attempt
    await waitFor(() => {
      expect(attempt).toBeGreaterThanOrEqual(1);
    });

    unmount();

    const attemptsAtUnmount = attempt;
    // Wait a bit to ensure no more attempts happen
    await new Promise((r) => setTimeout(r, 200));
    expect(attempt).toBe(attemptsAtUnmount);
  });

  it("exponential backoff (retryDelay as function)", async () => {
    const delays: number[] = [];
    let attempt = 0;

    const { result } = renderHook(() =>
      useResultAsync(
        () => {
          attempt++;
          if (attempt <= 3) return ResultAsync.err("fail");
          return ResultAsync.ok("done");
        },
        [],
        {
          retry: 3,
          retryDelay: (a, _e) => {
            const d = 10 * (a + 1);
            delays.push(d);
            return d;
          },
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(delays).toEqual([10, 20, 30]);
    expect(result.current.result).toBeOk("done");
  });
});
