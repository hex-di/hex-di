/**
 * Tests for GraphPanel (new implementation).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GraphPanel } from "../../src/panels/graph-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import { createMockDataSource, createWrapper, setupTestEnvironment } from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("GraphPanel", () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it("renders with data", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("graph-panel")).toBeDefined();
  });

  it("renders empty state when no data", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getGraphData).mockReturnValue(undefined);
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("graph-edge-state-empty")).toBeDefined();
  });

  it("renders graph header with container info", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("graph-header")).toBeDefined();
    expect(screen.getByTestId("container-selector")).toBeDefined();
  });

  it("renders graph toolbar", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("graph-toolbar")).toBeDefined();
  });

  it("renders graph canvas with nodes", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("graph-canvas")).toBeDefined();
    // Our test data has 3 adapters: Logger, Database, UserService
    expect(screen.getByTestId("graph-node-Logger")).toBeDefined();
    expect(screen.getByTestId("graph-node-Database")).toBeDefined();
    expect(screen.getByTestId("graph-node-UserService")).toBeDefined();
  });

  it("renders edges between dependent nodes", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    // Database depends on Logger
    expect(screen.getByTestId("graph-edge-Logger-Database")).toBeDefined();
    // UserService depends on Logger and Database
    expect(screen.getByTestId("graph-edge-Logger-UserService")).toBeDefined();
    expect(screen.getByTestId("graph-edge-Database-UserService")).toBeDefined();
  });

  it("re-renders on rerender (graph data stays stable)", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    const { rerender } = render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    rerender(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("graph-panel")).toBeDefined();
  });

  it("works with dark theme", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds, "dark");

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="dark" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("graph-panel")).toBeDefined();
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
          <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
        </ErrorBoundary>
      </Wrapper>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    console.error = originalError;
  });

  it("shows kind badge for container", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("kind-badge")).toBeDefined();
    expect(screen.getByTestId("kind-badge").textContent).toBe("root");
  });

  it("renders aria-label on graph panel region", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <GraphPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    const panel = screen.getByTestId("graph-panel");
    expect(panel.getAttribute("role")).toBe("region");
    expect(panel.getAttribute("aria-label")).toBe("Graph Panel");
  });
});
