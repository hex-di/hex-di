// @traces INV-R3
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup, waitFor, act } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { useResultAsync } from "../../src/hooks/use-result-async.js";

afterEach(cleanup);

describe("GxP: Stale data prevention (INV-R3)", () => {
  it("rapid deps changes discard stale responses", async () => {
    const resolvers: Array<(v: string) => void> = [];
    let callIndex = 0;

    const { result, rerender } = renderHook(
      ({ dep }: { dep: number }) =>
        useResultAsync(
          () => {
            const idx = callIndex++;
            return ResultAsync.fromSafePromise(
              new Promise<string>((resolve) => {
                resolvers[idx] = resolve;
              }),
            );
          },
          [dep],
        ),
      { initialProps: { dep: 1 } },
    );

    // Trigger rapid deps changes
    rerender({ dep: 2 });
    rerender({ dep: 3 });

    // Resolve first request (stale - dep was 1)
    await act(async () => {
      resolvers[0]?.("result-for-dep-1");
    });

    // Result should either be undefined (still loading) or NOT from dep 1
    if (result.current.result !== undefined) {
      expect(result.current.result).not.toBeOk("result-for-dep-1");
    }

    // Resolve last request (current - dep is 3)
    await act(async () => {
      resolvers[resolvers.length - 1]?.("result-for-dep-3");
    });

    await waitFor(() => {
      expect(result.current.result).toBeOk("result-for-dep-3");
    });
  });

  it("out-of-order resolution picks latest generation only", async () => {
    let resolverA: ((v: string) => void) | null = null;
    let resolverB: ((v: string) => void) | null = null;
    let callCount = 0;

    const { result, rerender } = renderHook(
      ({ dep }: { dep: string }) =>
        useResultAsync(
          () => {
            callCount++;
            return ResultAsync.fromSafePromise(
              new Promise<string>((resolve) => {
                if (dep === "a") resolverA = resolve;
                else resolverB = resolve;
              }),
            );
          },
          [dep],
        ),
      { initialProps: { dep: "a" } },
    );

    rerender({ dep: "b" });

    // Resolve B first (correct order for latest)
    await act(async () => {
      resolverB?.("B-data");
    });

    await waitFor(() => {
      expect(result.current.result).toBeOk("B-data");
    });

    // Now resolve A (stale) - should not overwrite
    await act(async () => {
      resolverA?.("A-data");
    });

    // Result should still be B-data
    expect(result.current.result).toBeOk("B-data");
  });
});
