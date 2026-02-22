/**
 * Tests for OverviewPanel.
 *
 * Spec Section 43.3.1:
 * 1. Renders with data
 * 2. Renders empty state
 * 3. Re-renders on event
 * 4. Theme variants
 * 5. Error boundary isolation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { OverviewPanel } from "../../src/panels/overview-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import {
  createMockDataSource,
  createWrapper,
  setupTestEnvironment,
  baseUnifiedSnapshot,
} from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("OverviewPanel", () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it("renders with data", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <OverviewPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("overview-panel")).toBeDefined();
    expect(screen.getByText("Container")).toBeDefined();
  });

  it("renders empty state when no data", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getUnifiedSnapshot).mockReturnValue(undefined);
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <OverviewPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("empty-state")).toBeDefined();
  });

  it("re-renders on event", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <OverviewPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    const updatedSnapshot = {
      ...baseUnifiedSnapshot,
      registeredLibraries: ["tracing", "flow"],
      libraries: {
        ...baseUnifiedSnapshot.libraries,
        flow: { activities: 5 },
      },
    };

    act(() => {
      vi.mocked(ds.getUnifiedSnapshot).mockReturnValue(updatedSnapshot);
      ds.emit({ type: "snapshot-changed" });
    });

    // After event, the panel should re-render with new data
    // SectionHeader shows "Libraries" title with count badge
    expect(screen.getByText("Libraries")).toBeDefined();
    // Both library cards should be rendered (tracing + flow)
    expect(screen.getByText("tracing")).toBeDefined();
    expect(screen.getByText("flow")).toBeDefined();
  });

  it("works with dark theme", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds, "dark");

    render(
      <Wrapper>
        <OverviewPanel dataSource={ds} theme="dark" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("overview-panel")).toBeDefined();
  });

  it("error boundary isolates errors", () => {
    const originalError = console.error;
    console.error = vi.fn();
    const ds = createMockDataSource();
    vi.mocked(ds.getUnifiedSnapshot).mockImplementation(() => {
      throw new Error("Test crash");
    });
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ErrorBoundary>
          <OverviewPanel dataSource={ds} theme="light" width={800} height={600} />
        </ErrorBoundary>
      </Wrapper>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    console.error = originalError;
  });
});
