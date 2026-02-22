// @traces BEH-R02-001 INV-R8
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup, waitFor } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { useResultAsync } from "../../src/hooks/use-result-async.js";

afterEach(cleanup);

describe("Integration: Retry with abort cancellation (BEH-R02-001, INV-R8)", () => {
  it("retries on Err then succeeds", async () => {
    let callCount = 0;
    const { result } = renderHook(() =>
      useResultAsync(
        () => {
          callCount++;
          if (callCount < 3) return ResultAsync.err("transient");
          return ResultAsync.ok("recovered");
        },
        [],
        { retry: 3, retryDelay: 10 },
      ),
    );

    await waitFor(
      () => {
        expect(result.current.result).toBeOk("recovered");
      },
      { timeout: 2000 },
    );
    expect(callCount).toBe(3);
  });

  it("abort cancels pending retries on unmount (INV-R2, INV-R8)", async () => {
    let callCount = 0;
    const { unmount } = renderHook(() =>
      useResultAsync(
        () => {
          callCount++;
          return ResultAsync.err("always-fail");
        },
        [],
        { retry: 10, retryDelay: 50 },
      ),
    );

    // Wait for at least 1 call
    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    const countAtUnmount = callCount;
    unmount();

    // Wait and verify no more calls happen
    await new Promise((r) => setTimeout(r, 200));
    expect(callCount).toBeLessThanOrEqual(countAtUnmount + 1);
  });
});
