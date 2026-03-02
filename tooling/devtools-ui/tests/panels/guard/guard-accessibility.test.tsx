/**
 * Unit tests for GuardAccessibility component.
 *
 * Spec: 15-accessibility.md (15.1-15.10)
 */

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GuardAccessibility } from "../../../src/panels/guard/accessibility.js";

describe("GuardAccessibility", () => {
  beforeEach(() => {
    // jsdom does not implement window.matchMedia; provide a stub.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  afterEach(cleanup);

  it("renders children", () => {
    render(
      <GuardAccessibility activeView="tree">
        <div data-testid="child-element">Hello</div>
      </GuardAccessibility>
    );

    expect(screen.getByTestId("child-element")).toBeDefined();
    expect(screen.getByTestId("child-element").textContent).toBe("Hello");
  });

  it("has live region for announcements", () => {
    render(
      <GuardAccessibility activeView="tree">
        <span />
      </GuardAccessibility>
    );

    const announcer = screen.getByTestId("guard-sr-announcer");
    expect(announcer.getAttribute("aria-live")).toBe("polite");
  });

  it("renders with region role", () => {
    render(
      <GuardAccessibility activeView="tree">
        <span />
      </GuardAccessibility>
    );

    const wrapper = screen.getByTestId("guard-accessibility");
    expect(wrapper.getAttribute("role")).toBe("region");
    expect(wrapper.getAttribute("aria-label")).toBe("Guard Panel");
  });

  it("shows data-contrast-compliant", () => {
    render(
      <GuardAccessibility activeView="tree">
        <span />
      </GuardAccessibility>
    );

    const wrapper = screen.getByTestId("guard-accessibility");
    expect(wrapper.getAttribute("data-contrast-compliant")).toBe("true");
  });

  it("announces view switch", () => {
    const { rerender } = render(
      <GuardAccessibility activeView="tree">
        <span />
      </GuardAccessibility>
    );

    rerender(
      <GuardAccessibility activeView="log">
        <span />
      </GuardAccessibility>
    );

    const announcer = screen.getByTestId("guard-sr-announcer");
    expect(announcer.textContent).toContain("Switched to Decision Log view");
  });

  it("announces descriptor selection", () => {
    render(
      <GuardAccessibility activeView="tree" selectedDescriptorLabel="testPort">
        <span />
      </GuardAccessibility>
    );

    const announcer = screen.getByTestId("guard-sr-announcer");
    expect(announcer.textContent).toContain("Selected policy: testPort");
  });

  it("forwards external announcements", () => {
    render(
      <GuardAccessibility activeView="tree" decisionAnnouncement="Access denied for user-1">
        <span />
      </GuardAccessibility>
    );

    const announcer = screen.getByTestId("guard-sr-announcer");
    expect(announcer.textContent).toContain("Access denied for user-1");
  });
});
