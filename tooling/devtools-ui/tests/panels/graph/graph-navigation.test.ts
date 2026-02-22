/**
 * Tests for useGraphNavigation hook.
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGraphNavigation } from "../../../src/panels/graph/use-graph-navigation.js";

describe("useGraphNavigation", () => {
  it("navigateToContainer calls navigateTo with container panel", () => {
    const navigateTo = vi.fn();
    const { result } = renderHook(() => useGraphNavigation({ navigateTo }));
    act(() => result.current.navigateToContainer("MyContainer"));
    expect(navigateTo).toHaveBeenCalledWith("container", { name: "MyContainer" });
  });

  it("navigateToPort calls navigateTo with port param", () => {
    const navigateTo = vi.fn();
    const { result } = renderHook(() => useGraphNavigation({ navigateTo }));
    act(() => result.current.navigateToPort("LoggerPort"));
    expect(navigateTo).toHaveBeenCalledWith("container", { port: "LoggerPort" });
  });

  it("navigateToTracing calls navigateTo with tracing panel", () => {
    const navigateTo = vi.fn();
    const { result } = renderHook(() => useGraphNavigation({ navigateTo }));
    act(() => result.current.navigateToTracing("DbPort"));
    expect(navigateTo).toHaveBeenCalledWith("tracing", { port: "DbPort" });
  });

  it("navigateToHealth calls navigateTo with health panel", () => {
    const navigateTo = vi.fn();
    const { result } = renderHook(() => useGraphNavigation({ navigateTo }));
    act(() => result.current.navigateToHealth());
    expect(navigateTo).toHaveBeenCalledWith("health");
  });

  it("handleInboundNavigation navigates to container when containerName present", () => {
    const navigateTo = vi.fn();
    const { result } = renderHook(() => useGraphNavigation({ navigateTo }));
    act(() =>
      result.current.handleInboundNavigation({
        portName: "Port",
        containerName: "Root",
      })
    );
    expect(navigateTo).toHaveBeenCalledWith("container", { name: "Root" });
  });

  it("handleInboundNavigation navigates to port when no containerName", () => {
    const navigateTo = vi.fn();
    const { result } = renderHook(() => useGraphNavigation({ navigateTo }));
    act(() => result.current.handleInboundNavigation({ portName: "LoggerPort" }));
    expect(navigateTo).toHaveBeenCalledWith("container", { port: "LoggerPort" });
  });

  it("does not throw when navigateTo is undefined", () => {
    const { result } = renderHook(() => useGraphNavigation({}));
    expect(() => {
      act(() => result.current.navigateToContainer("X"));
    }).not.toThrow();
  });
});
