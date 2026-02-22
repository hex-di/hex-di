// @traces BEH-R03-002
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { ok, type Result } from "@hex-di/result";
import { useOptimisticResult } from "../../../src/hooks/use-optimistic-result.js";

describe("useOptimisticResult (BEH-R03-002)", () => {
  it("returns the authoritative result when no optimistic update", () => {
    const authoritative: Result<string, string> = ok("original");
    const updateFn = (_current: Result<string, string>, optimistic: string) =>
      ok(optimistic) as Result<string, string>;

    const { result } = renderHook(() =>
      useOptimisticResult(authoritative, updateFn),
    );

    expect(result.current.result).toBeOk("original");
  });
});
