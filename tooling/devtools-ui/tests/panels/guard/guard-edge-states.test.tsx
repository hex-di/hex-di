/**
 * Unit tests for GuardEdgeStates component.
 *
 * Spec: 14-integration.md (14.8, 14.9)
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GuardEdgeStates } from "../../../src/panels/guard/edge-states.js";

describe("GuardEdgeStates", () => {
  afterEach(cleanup);

  it("renders loading state", () => {
    render(<GuardEdgeStates state="loading" message={undefined} />);

    const el = screen.getByTestId("guard-edge-state");
    expect(el.getAttribute("data-state")).toBe("loading");
    expect(screen.getByTestId("guard-edge-state-spinner")).toBeDefined();
  });

  it("renders empty state", () => {
    render(<GuardEdgeStates state="empty" message={undefined} />);

    const el = screen.getByTestId("guard-edge-state");
    expect(el.getAttribute("data-state")).toBe("empty");

    const label = screen.getByTestId("guard-edge-state-label");
    expect(label.textContent).toContain("No guard policies detected");
  });

  it("renders disconnected state", () => {
    render(<GuardEdgeStates state="disconnected" message={undefined} />);

    const hint = screen.getByTestId("guard-edge-state-hint");
    expect(hint.textContent).toContain("cached data");
  });

  it("renders error state", () => {
    render(<GuardEdgeStates state="error" message={undefined} />);

    const el = screen.getByTestId("guard-edge-state");
    expect(el.getAttribute("role")).toBe("alert");

    const hint = screen.getByTestId("guard-edge-state-hint");
    expect(hint.textContent).toContain("Try switching");
  });

  it("shows custom message", () => {
    render(<GuardEdgeStates state="error" message="Custom error" />);

    const message = screen.getByTestId("guard-edge-state-message");
    expect(message.textContent).toBe("Custom error");
  });

  it("shows state icon", () => {
    render(<GuardEdgeStates state="loading" message={undefined} />);

    expect(screen.getByTestId("guard-edge-state-icon")).toBeDefined();
  });

  it("shows state label", () => {
    render(<GuardEdgeStates state="loading" message={undefined} />);

    const label = screen.getByTestId("guard-edge-state-label");
    expect(label.textContent).toBe("Loading guard data...");
  });
});
