/**
 * Tests for TracingPanel.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { TracingPanel } from "../../src/panels/tracing-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import { createMockDataSource, createWrapper, setupTestEnvironment } from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("TracingPanel", () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it("renders with summary data", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <TracingPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("tracing-panel")).toBeDefined();
  });

  it("renders empty state when no tracing data", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getLibraryInspectors).mockReturnValue(new Map());
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <TracingPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    // When no tracing inspector, the panel shows an empty state
    expect(screen.getByTestId("empty-state")).toBeDefined();
  });

  it("re-renders on resolution event", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <TracingPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    act(() => {
      ds.emit({
        type: "resolution",
        portName: "Logger",
        duration: 5.2,
        isCacheHit: false,
      });
    });

    expect(screen.getByTestId("tracing-panel")).toBeDefined();
  });

  it("works with dark theme", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds, "dark");

    render(
      <Wrapper>
        <TracingPanel dataSource={ds} theme="dark" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("tracing-panel")).toBeDefined();
  });

  it("error boundary isolates errors", () => {
    const originalError = console.error;
    console.error = vi.fn();
    const ds = createMockDataSource();
    vi.mocked(ds.getLibraryInspectors).mockImplementation(() => {
      throw new Error("Test crash");
    });
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ErrorBoundary>
          <TracingPanel dataSource={ds} theme="light" width={800} height={600} />
        </ErrorBoundary>
      </Wrapper>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    console.error = originalError;
  });
});
