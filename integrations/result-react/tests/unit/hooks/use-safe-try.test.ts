// @traces BEH-R03-003 INV-R2 INV-R3
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ok, err, ResultAsync } from "@hex-di/result";
import { useSafeTry } from "../../../src/hooks/use-safe-try.js";

describe("useSafeTry (BEH-R03-003)", () => {
  it("sync generator, all Ok -> composed result", async () => {
    const { result } = renderHook(() =>
      useSafeTry(function* () {
        const a = yield* ok(1);
        const b = yield* ok(2);
        return ok(a + b);
      }, [])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeOk(3);
  });

  it("sync generator, early Err -> short-circuit", async () => {
    const { result } = renderHook(() =>
      useSafeTry(function* () {
        const a = yield* ok(1);
        const _b = yield* err("fail");
        return ok(a);
      }, [])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeErr("fail");
  });

  it("async generator, sequential Ok", async () => {
    const { result } = renderHook(() =>
      useSafeTry(async function* () {
        const a = yield* await ResultAsync.ok(10);
        const b = yield* await ResultAsync.ok(20);
        return ok(a + b);
      }, [])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeOk(30);
  });

  it("async generator, early Err", async () => {
    const { result } = renderHook(() =>
      useSafeTry(async function* () {
        const _a = yield* await ResultAsync.ok(10);
        const _b = yield* await ResultAsync.err("boom");
        return ok(0);
      }, [])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeErr("boom");
  });

  it("abort on unmount (INV-R2)", async () => {
    let capturedSignal: AbortSignal | null = null;

    const { unmount } = renderHook(() =>
      useSafeTry(async function* (signal) {
        capturedSignal = signal;
        yield* await ResultAsync.fromPromise(
          new Promise(() => {}), // never resolves
          () => "error"
        );
        return ok(0);
      }, [])
    );

    await waitFor(() => {
      expect(capturedSignal).not.toBeNull();
    });

    unmount();
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("abort on deps change", async () => {
    const signals: AbortSignal[] = [];

    const { rerender } = renderHook(
      ({ dep }: { dep: number }) =>
        useSafeTry(
          function* (signal) {
            signals.push(signal);
            return ok(dep);
          },
          [dep]
        ),
      { initialProps: { dep: 1 } }
    );

    await waitFor(() => {
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    rerender({ dep: 2 });

    await waitFor(() => {
      expect(signals.length).toBeGreaterThanOrEqual(2);
    });
    expect(signals[0].aborted).toBe(true);
  });
});
