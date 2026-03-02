/**
 * Unit tests for GuardRealTime component.
 *
 * Spec: 11-interactions.md (11.14)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GuardRealTime } from "../../../src/panels/guard/real-time.js";

describe("GuardRealTime", () => {
  afterEach(cleanup);

  it("renders connected live state", () => {
    render(
      <GuardRealTime
        connectionStatus="connected"
        paused={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
      />
    );

    const el = screen.getByTestId("guard-real-time");
    expect(el.textContent).toContain("Live");
  });

  it("renders paused state", () => {
    render(
      <GuardRealTime
        connectionStatus="connected"
        paused={true}
        onPause={vi.fn()}
        onResume={vi.fn()}
      />
    );

    const el = screen.getByTestId("guard-real-time");
    expect(el.textContent).toContain("Paused");
  });

  it("renders disconnected state", () => {
    render(
      <GuardRealTime
        connectionStatus="disconnected"
        paused={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
      />
    );

    const el = screen.getByTestId("guard-real-time");
    expect(el.textContent).toContain("Disconnected");
  });

  it("shows pause button when connected", () => {
    render(
      <GuardRealTime
        connectionStatus="connected"
        paused={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
      />
    );

    const toggle = screen.getByTestId("guard-real-time-toggle");
    expect(toggle.textContent).toBe("Pause");
  });

  it("shows resume button when paused", () => {
    render(
      <GuardRealTime
        connectionStatus="connected"
        paused={true}
        onPause={vi.fn()}
        onResume={vi.fn()}
      />
    );

    const toggle = screen.getByTestId("guard-real-time-toggle");
    expect(toggle.textContent).toBe("Resume");
  });

  it("calls onPause on toggle from live", () => {
    const onPause = vi.fn();
    render(
      <GuardRealTime
        connectionStatus="connected"
        paused={false}
        onPause={onPause}
        onResume={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("guard-real-time-toggle"));

    expect(onPause).toHaveBeenCalledOnce();
  });

  it("calls onResume on toggle from paused", () => {
    const onResume = vi.fn();
    render(
      <GuardRealTime
        connectionStatus="connected"
        paused={true}
        onPause={vi.fn()}
        onResume={onResume}
      />
    );

    fireEvent.click(screen.getByTestId("guard-real-time-toggle"));

    expect(onResume).toHaveBeenCalledOnce();
  });

  it("shows disconnected message", () => {
    render(
      <GuardRealTime
        connectionStatus="disconnected"
        paused={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
      />
    );

    expect(screen.getByTestId("guard-real-time-disconnected")).toBeDefined();
  });

  it("no toggle button when disconnected", () => {
    render(
      <GuardRealTime
        connectionStatus="disconnected"
        paused={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
      />
    );

    expect(screen.queryByTestId("guard-real-time-toggle")).toBeNull();
  });
});
