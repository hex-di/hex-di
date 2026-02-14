/**
 * Tests for EventLogPanel.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { EventLogPanel } from "../../src/panels/event-log-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import { createMockDataSource, createWrapper, setupTestEnvironment } from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("EventLogPanel", () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it("renders empty state when no events", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <EventLogPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("empty-state")).toBeDefined();
  });

  it("renders events when received", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <EventLogPanel dataSource={ds} theme="light" width={800} height={600} />
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

    expect(screen.getByTestId("event-log-panel")).toBeDefined();
    expect(screen.getByText("resolution")).toBeDefined();
  });

  it("re-renders on additional events", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <EventLogPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    act(() => {
      ds.emit({ type: "snapshot-changed" });
    });

    act(() => {
      ds.emit({
        type: "resolution",
        portName: "Database",
        duration: 10.1,
        isCacheHit: true,
      });
    });

    expect(screen.getByTestId("event-log-panel")).toBeDefined();
  });

  it("works with dark theme", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds, "dark");

    render(
      <Wrapper>
        <EventLogPanel dataSource={ds} theme="dark" width={800} height={600} />
      </Wrapper>
    );

    // Emit so we see the panel
    act(() => {
      ds.emit({ type: "snapshot-changed" });
    });

    expect(screen.getByTestId("event-log-panel")).toBeDefined();
  });

  it("error boundary isolates errors", () => {
    const originalError = console.error;
    console.error = vi.fn();
    const ds = createMockDataSource();
    // Make subscribe throw
    const badDs = {
      ...ds,
      subscribe: () => {
        throw new Error("Test crash");
      },
    };
    const Wrapper = createWrapper(badDs);

    render(
      <Wrapper>
        <ErrorBoundary>
          <EventLogPanel dataSource={badDs} theme="light" width={800} height={600} />
        </ErrorBoundary>
      </Wrapper>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    console.error = originalError;
  });
});
