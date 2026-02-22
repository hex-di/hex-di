/// <reference lib="dom" />
/**
 * Framework integration tests - React hooks and provider.
 *
 * @vitest-environment jsdom
 *
 * Tests 8-11: React logging provider and hooks.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { LoggingProvider, useLogger, useChildLogger, useLifecycleLogger } from "../src/react.js";
import { createMemoryLogger } from "@hex-di/logger";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * A component that reads the logger from context and displays its context.
 */
function LoggerConsumer({ testId }: { readonly testId?: string }): React.ReactNode {
  const logger = useLogger();
  const ctx = logger.getContext();
  return <div data-testid={testId ?? "logger-context"}>{JSON.stringify(ctx)}</div>;
}

/**
 * A component that uses useChildLogger and displays the child's context.
 */
function ChildLoggerConsumer({
  context,
  testId,
}: {
  readonly context: Record<string, unknown>;
  readonly testId?: string;
}): React.ReactNode {
  const child = useChildLogger(context);
  const ctx = child.getContext();
  return <div data-testid={testId ?? "child-context"}>{JSON.stringify(ctx)}</div>;
}

/**
 * A component that uses useLifecycleLogger.
 */
function LifecycleComponent({ name }: { readonly name: string }): React.ReactNode {
  useLifecycleLogger(name);
  return <div data-testid="lifecycle">Lifecycle component</div>;
}

// =============================================================================
// Tests
// =============================================================================

describe("React Logging Integration", () => {
  it("useLogger() returns logger from provider", () => {
    const logger = createMemoryLogger();

    render(
      <LoggingProvider logger={logger}>
        <LoggerConsumer />
      </LoggingProvider>
    );

    const el = screen.getByTestId("logger-context");
    expect(el.textContent).toBe("{}");
  });

  it("useChildLogger() returns child with merged context", () => {
    const logger = createMemoryLogger();

    render(
      <LoggingProvider logger={logger} context={{ service: "test-service" }}>
        <ChildLoggerConsumer context={{ requestId: "req-123" }} />
      </LoggingProvider>
    );

    const el = screen.getByTestId("child-context");
    const parsed = JSON.parse(el.textContent ?? "{}") as Record<string, unknown>;
    expect(parsed.service).toBe("test-service");
    expect(parsed.requestId).toBe("req-123");
  });

  it("useLifecycleLogger() logs mount and unmount", () => {
    const logger = createMemoryLogger();

    const { unmount } = render(
      <LoggingProvider logger={logger}>
        <LifecycleComponent name="TestWidget" />
      </LoggingProvider>
    );

    // Should have logged mount
    const mountEntry = logger.findEntry(e => e.message === "TestWidget mounted");
    expect(mountEntry).toBeDefined();
    expect(mountEntry?.level).toBe("debug");

    // Unmount and check unmount log
    unmount();

    const unmountEntry = logger.findEntry(e => e.message === "TestWidget unmounted");
    expect(unmountEntry).toBeDefined();
    expect(unmountEntry?.level).toBe("debug");
  });

  it("nested LoggingProviders create context chain", () => {
    const outerLogger = createMemoryLogger();
    const innerLogger = createMemoryLogger();

    render(
      <LoggingProvider logger={outerLogger} context={{ service: "outer" }}>
        <LoggerConsumer testId="outer-context" />
        <LoggingProvider logger={innerLogger} context={{ requestId: "inner-req" }}>
          <LoggerConsumer testId="inner-context" />
        </LoggingProvider>
      </LoggingProvider>
    );

    const outerEl = screen.getByTestId("outer-context");
    const outerCtx = JSON.parse(outerEl.textContent ?? "{}") as Record<string, unknown>;
    expect(outerCtx.service).toBe("outer");

    // The inner provider should create a child from the outer logger
    // (not from innerLogger) because a parent context exists
    const innerEl = screen.getByTestId("inner-context");
    const innerCtx = JSON.parse(innerEl.textContent ?? "{}") as Record<string, unknown>;
    expect(innerCtx.requestId).toBe("inner-req");
  });
});
