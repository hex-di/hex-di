// @traces BEH-R03-004 INV-R11
import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { useResultTransition } from "../../../src/hooks/use-result-transition.js";

describe("useResultTransition (BEH-R03-004)", () => {
  it("resolves result via startResultTransition", async () => {
    const { result } = renderHook(() => useResultTransition<string, string>());

    expect(result.current.result).toBeUndefined();
    expect(result.current.isPending).toBe(false);

    await act(async () => {
      result.current.startResultTransition(() => ResultAsync.ok("done"));
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(result.current.result).toBeOk("done");
  });
});
