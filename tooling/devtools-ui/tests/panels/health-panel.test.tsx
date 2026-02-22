/**
 * Tests for HealthPanel.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HealthPanel } from "../../src/panels/health-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import { createMockDataSource, createWrapper, setupTestEnvironment } from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("HealthPanel", () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it("renders with data", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <HealthPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("health-panel")).toBeDefined();
    expect(screen.getByText("Graph Health")).toBeDefined();
  });

  it("renders empty state when no data", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getGraphData).mockReturnValue(undefined);
    vi.mocked(ds.getScopeTree).mockReturnValue(undefined);
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <HealthPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("empty-state")).toBeDefined();
  });

  it("re-renders on rerender", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    const { rerender } = render(
      <Wrapper>
        <HealthPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    rerender(
      <Wrapper>
        <HealthPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("health-panel")).toBeDefined();
  });

  it("works with dark theme", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds, "dark");

    render(
      <Wrapper>
        <HealthPanel dataSource={ds} theme="dark" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("health-panel")).toBeDefined();
  });

  it("error boundary isolates errors", () => {
    const originalError = console.error;
    console.error = vi.fn();
    const ds = createMockDataSource();
    vi.mocked(ds.getGraphData).mockImplementation(() => {
      throw new Error("Test crash");
    });
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ErrorBoundary>
          <HealthPanel dataSource={ds} theme="light" width={800} height={600} />
        </ErrorBoundary>
      </Wrapper>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    console.error = originalError;
  });
});
