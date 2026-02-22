// @traces BEH-R03-001 INV-R1
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ok, err } from "@hex-di/result";
import { useResult } from "../../../src/hooks/use-result.js";

describe("useResult (BEH-R03-001)", () => {
  it("starts as undefined when no initial value", () => {
    const { result } = renderHook(() => useResult<string, string>());
    expect(result.current.result).toBeUndefined();
  });

  it("starts with initial value when provided", () => {
    const initial = ok("hello");
    const { result } = renderHook(() => useResult(initial));
    expect(result.current.result).toBeOk("hello");
  });

  it("setOk updates to Ok", () => {
    const { result } = renderHook(() => useResult<number, string>());
    act(() => result.current.setOk(42));
    expect(result.current.result).toBeOk(42);
  });

  it("setErr updates to Err", () => {
    const { result } = renderHook(() => useResult<number, string>());
    act(() => result.current.setErr("fail"));
    expect(result.current.result).toBeErr("fail");
  });

  it("set accepts arbitrary Result", () => {
    const { result } = renderHook(() => useResult<number, string>());
    act(() => result.current.set(err("error")));
    expect(result.current.result).toBeErr("error");
    act(() => result.current.set(ok(99)));
    expect(result.current.result).toBeOk(99);
  });

  it("reset returns to undefined (no initial)", () => {
    const { result } = renderHook(() => useResult<number, string>());
    act(() => result.current.setOk(42));
    expect(result.current.result).toBeOk(42);
    act(() => result.current.reset());
    expect(result.current.result).toBeUndefined();
  });

  it("reset returns to initial value", () => {
    const initial = ok("default");
    const { result } = renderHook(() => useResult(initial));
    act(() => result.current.setOk("changed"));
    expect(result.current.result).toBeOk("changed");
    act(() => result.current.reset());
    expect(result.current.result).toBeOk("default");
  });

  it("all actions are referentially stable across re-renders", () => {
    const { result, rerender } = renderHook(() =>
      useResult<number, string>(),
    );
    const firstSetOk = result.current.setOk;
    const firstSetErr = result.current.setErr;
    const firstSet = result.current.set;
    const firstReset = result.current.reset;

    rerender();

    expect(result.current.setOk).toBe(firstSetOk);
    expect(result.current.setErr).toBe(firstSetErr);
    expect(result.current.set).toBe(firstSet);
    expect(result.current.reset).toBe(firstReset);
  });
});
