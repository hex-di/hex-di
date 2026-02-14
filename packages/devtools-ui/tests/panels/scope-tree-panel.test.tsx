/**
 * Tests for ScopeTreePanel.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { ScopeTreePanel } from "../../src/panels/scope-tree-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import { createMockDataSource, createWrapper, setupTestEnvironment } from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("ScopeTreePanel", () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it("renders with data", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ScopeTreePanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("scope-tree-panel")).toBeDefined();
  });

  it("renders empty state when no data", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getScopeTree).mockReturnValue(undefined);
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ScopeTreePanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("empty-state")).toBeDefined();
  });

  it("re-renders on event", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ScopeTreePanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    act(() => {
      ds.emit({ type: "snapshot-changed" });
    });

    expect(screen.getByTestId("scope-tree-panel")).toBeDefined();
  });

  it("works with dark theme", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds, "dark");

    render(
      <Wrapper>
        <ScopeTreePanel dataSource={ds} theme="dark" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("scope-tree-panel")).toBeDefined();
  });

  it("error boundary isolates errors", () => {
    const originalError = console.error;
    console.error = vi.fn();
    const ds = createMockDataSource();
    vi.mocked(ds.getScopeTree).mockImplementation(() => {
      throw new Error("Test crash");
    });
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ErrorBoundary>
          <ScopeTreePanel dataSource={ds} theme="light" width={800} height={600} />
        </ErrorBoundary>
      </Wrapper>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    console.error = originalError;
  });
});
