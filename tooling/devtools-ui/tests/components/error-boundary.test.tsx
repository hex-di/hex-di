/**
 * Tests for ErrorBoundary component.
 *
 * Spec Section 43.4
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorBoundary } from "../../src/components/error-boundary.js";

function ThrowingComponent(): React.ReactElement {
  throw new Error("Test error");
}

afterEach(() => {
  cleanup();
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">OK</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId("child").textContent).toBe("OK");
  });

  it("renders fallback when child throws", () => {
    const originalConsoleError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    const fallback = screen.getByTestId("error-boundary-fallback");
    expect(fallback).toBeDefined();
    expect(fallback.textContent).toContain("Test error");

    console.error = originalConsoleError;
  });

  it("renders custom fallback when provided", () => {
    const originalConsoleError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("custom-fallback").textContent).toBe("Custom");

    console.error = originalConsoleError;
  });
});
