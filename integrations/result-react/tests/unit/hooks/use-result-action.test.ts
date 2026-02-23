// @traces BEH-R02-002 INV-R1 INV-R2 INV-R3
import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ok, ResultAsync } from "@hex-di/result";
import { useResultAction } from "../../../src/hooks/use-result-action.js";

describe("useResultAction (BEH-R02-002)", () => {
  it("starts result=undefined, isLoading=false", () => {
    const { result } = renderHook(() =>
      useResultAction((_signal: AbortSignal) => ResultAsync.ok("value"))
    );
    expect(result.current.result).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("execute triggers, sets loading, resolves", async () => {
    const { result } = renderHook(() =>
      useResultAction((_signal: AbortSignal, x: number) => ResultAsync.ok(x * 2))
    );

    let executeResult: unknown;
    await act(async () => {
      executeResult = await result.current.execute(21);
    });

    expect(result.current.result).toBeOk(42);
    expect(result.current.isLoading).toBe(false);
    expect(executeResult).toBeOk(42);
  });

  it("execute aborts previous in-flight", async () => {
    const capturedSignals: AbortSignal[] = [];

    const { result } = renderHook(() =>
      useResultAction((signal: AbortSignal) => {
        capturedSignals.push(signal);
        return ResultAsync.fromPromise(
          new Promise<string>(resolve => setTimeout(() => resolve("done"), 100)),
          () => "error"
        );
      })
    );

    // Fire two executions quickly
    void act(() => {
      void result.current.execute();
    });
    void act(() => {
      void result.current.execute();
    });

    await waitFor(() => {
      expect(capturedSignals.length).toBe(2);
    });

    // First signal should have been aborted
    expect(capturedSignals[0].aborted).toBe(true);
  });

  it("reset clears result and aborts", async () => {
    const { result } = renderHook(() =>
      useResultAction((_signal: AbortSignal) => ResultAsync.ok("value"))
    );

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.result).toBeOk("value");

    void act(() => {
      result.current.reset();
    });
    expect(result.current.result).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("unmount aborts current (INV-R2)", async () => {
    let capturedSignal: AbortSignal | null = null;

    const { result, unmount } = renderHook(() =>
      useResultAction((signal: AbortSignal) => {
        capturedSignal = signal;
        return ResultAsync.fromPromise(
          new Promise(() => {}), // never resolves
          () => "error"
        );
      })
    );

    void act(() => {
      void result.current.execute();
    });

    await waitFor(() => {
      expect(capturedSignal).not.toBeNull();
    });

    unmount();
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("stale response discarded (INV-R3)", async () => {
    const resolvers: Array<(v: string) => void> = [];

    const { result } = renderHook(() =>
      useResultAction((_signal: AbortSignal) =>
        ResultAsync.fromSafePromise(
          new Promise<string>(resolve => {
            resolvers.push(resolve);
          })
        )
      )
    );

    // Fire first execution
    void act(() => {
      void result.current.execute();
    });

    await waitFor(() => {
      expect(resolvers.length).toBe(1);
    });

    // Fire second execution (aborts first)
    void act(() => {
      void result.current.execute();
    });

    await waitFor(() => {
      expect(resolvers.length).toBe(2);
    });

    // Resolve stale first, then fresh
    await act(async () => {
      resolvers[0]("stale");
    });

    await act(async () => {
      resolvers[1]("fresh");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.result).toBeOk("fresh");
  });

  it("execute and reset stable (INV-R1)", () => {
    const { result, rerender } = renderHook(() =>
      useResultAction((_signal: AbortSignal) => ResultAsync.ok(1))
    );
    const firstExecute = result.current.execute;
    const firstReset = result.current.reset;
    rerender();
    expect(result.current.execute).toBe(firstExecute);
    expect(result.current.reset).toBe(firstReset);
  });

  it("works with sync Result return", async () => {
    const { result } = renderHook(() =>
      useResultAction((_signal: AbortSignal, x: number) => ok(x + 1))
    );

    await act(async () => {
      await result.current.execute(41);
    });
    expect(result.current.result).toBeOk(42);
  });
});
