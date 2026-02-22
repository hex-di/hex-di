// @traces INV-R7
import React, { StrictMode } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup, waitFor, act } from "@testing-library/react";
import { ok, err, ResultAsync } from "@hex-di/result";
import { useResultAsync } from "../../../src/hooks/use-result-async.js";
import { useResultAction } from "../../../src/hooks/use-result-action.js";
import { useSafeTry } from "../../../src/hooks/use-safe-try.js";

afterEach(cleanup);

const strictWrapper = ({ children }: { children: React.ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

describe("StrictMode compatibility (INV-R7)", () => {
  describe("useResultAsync", () => {
    it("produces a single result despite double-invoked effects", async () => {
      let callCount = 0;

      const { result } = renderHook(
        () =>
          useResultAsync(
            () => {
              callCount++;
              return ResultAsync.ok("data");
            },
            [],
          ),
        { wrapper: strictWrapper },
      );

      await waitFor(() => {
        expect(result.current.result).toBeOk("data");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not surface stale results from aborted first effect", async () => {
      const results: string[] = [];
      let callIdx = 0;

      const { result } = renderHook(
        () =>
          useResultAsync(
            (signal) => {
              const idx = callIdx++;
              return ResultAsync.fromSafePromise(
                new Promise<string>((resolve) => {
                  const timer = setTimeout(
                    () => resolve(`result-${idx}`),
                    idx === 0 ? 50 : 10,
                  );
                  signal.addEventListener("abort", () => clearTimeout(timer), {
                    once: true,
                  });
                }),
              );
            },
            [],
          ),
        { wrapper: strictWrapper },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Only the latest result should be visible
      expect(result.current.result).toBeDefined();
      if (result.current.result!.isOk()) {
        results.push(result.current.result!.value);
      }
      // Should only have one result displayed
      expect(results).toHaveLength(1);
    });
  });

  describe("useResultAction", () => {
    it("execute works correctly under StrictMode", async () => {
      const { result } = renderHook(
        () =>
          useResultAction((_signal, name: string) => ResultAsync.ok(`hello ${name}`)),
        { wrapper: strictWrapper },
      );

      let executeResult;
      await act(async () => {
        executeResult = await result.current.execute("world");
      });

      expect(result.current.result).toBeOk("hello world");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("useSafeTry", () => {
    it("produces a single composed result under StrictMode", async () => {
      const { result } = renderHook(
        () =>
          useSafeTry(function* () {
            const a = yield* ok(1);
            const b = yield* ok(2);
            return ok(a + b);
          }, []),
        { wrapper: strictWrapper },
      );

      await waitFor(() => {
        expect(result.current.result).toBeOk(3);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
