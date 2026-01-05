/**
 * Tests for HexDiDevTools React component.
 *
 * These tests verify:
 * 1. HexDiDevTools renders toggle button by default
 * 2. Clicking toggle expands to full panel
 * 3. Position prop affects placement
 * 4. localStorage state persistence works
 * 5. Production mode renders null
 * 6. DevToolsPanel is rendered when expanded
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, pipe, createPluginWrapper } from "@hex-di/runtime";
import { InspectorPlugin } from "@hex-di/runtime";
import { HexDiDevTools } from "../src/react/hex-di-devtools.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

const withInspector = createPluginWrapper(InspectorPlugin);

/**
 * Creates a test container with InspectorPlugin installed.
 */
function createTestContainer() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });

  const DatabaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort],
    lifetime: "scoped",
    factory: () => ({ query: () => ({}) }),
  });

  const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

  return pipe(createContainer(graph, { name: "Test Container" }), withInspector);
}

/**
 * Creates an empty test container with InspectorPlugin installed.
 */
function createEmptyTestContainer() {
  const graph = GraphBuilder.create().build();
  return pipe(createContainer(graph, { name: "Empty Container" }), withInspector);
}

// =============================================================================
// localStorage Mock Factory
// =============================================================================

/**
 * Creates a fresh localStorage mock for each test.
 */
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    // Helper to preset value for tests
    _preset: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

// =============================================================================
// HexDiDevTools Basic Tests
// =============================================================================

describe("HexDiDevTools", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    // Create fresh mock for each test
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders toggle button by default", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} />);

    // Should render the toggle button
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    expect(toggleButton).toBeDefined();
    // Panel should not be visible initially
    expect(screen.queryByTestId("devtools-panel")).toBeNull();
  });

  it("clicking toggle expands to full panel", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} />);

    // Initially panel should not be visible
    expect(screen.queryByTestId("devtools-panel")).toBeNull();

    // Click the toggle button
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    fireEvent.click(toggleButton);

    // Panel should now be visible
    expect(screen.getByTestId("devtools-panel")).toBeDefined();

    // Click close button to close
    const closeButton = screen.getByTestId("devtools-floating-close");
    fireEvent.click(closeButton);

    // Panel should be hidden again
    expect(screen.queryByTestId("devtools-panel")).toBeNull();
  });

  it("position prop affects placement - bottom-right (default)", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} position="bottom-right" />);

    const wrapper = screen.getByTestId("devtools-floating-container");
    expect(wrapper.style.bottom).toBe("16px");
    expect(wrapper.style.right).toBe("16px");
  });

  it("position prop affects placement - bottom-left", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} position="bottom-left" />);

    const wrapper = screen.getByTestId("devtools-floating-container");
    expect(wrapper.style.bottom).toBe("16px");
    expect(wrapper.style.left).toBe("16px");
  });

  it("position prop affects placement - top-right", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} position="top-right" />);

    const wrapper = screen.getByTestId("devtools-floating-container");
    expect(wrapper.style.top).toBe("16px");
    expect(wrapper.style.right).toBe("16px");
  });

  it("position prop affects placement - top-left", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} position="top-left" />);

    const wrapper = screen.getByTestId("devtools-floating-container");
    expect(wrapper.style.top).toBe("16px");
    expect(wrapper.style.left).toBe("16px");
  });

  it("localStorage state persistence - saves open state", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} />);

    // Open the panel
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    fireEvent.click(toggleButton);

    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith("hex-di-devtools-open", "true");
  });

  it("localStorage state persistence - restores open state on mount", () => {
    const container = createTestContainer();

    // Pre-set localStorage value before mounting
    localStorageMock._preset("hex-di-devtools-open", "true");

    render(<HexDiDevTools container={container} />);

    // Panel should be open due to localStorage state
    expect(screen.getByTestId("devtools-panel")).toBeDefined();
  });

  it("localStorage state persistence - saves closed state", () => {
    const container = createTestContainer();

    // Start with open state
    localStorageMock._preset("hex-di-devtools-open", "true");

    render(<HexDiDevTools container={container} />);

    // Close the panel
    const closeButton = screen.getByTestId("devtools-floating-close");
    fireEvent.click(closeButton);

    // Should save closed state to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith("hex-di-devtools-open", "false");
  });

  it("DevToolsPanel is rendered when expanded with correct props", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} />);

    // Open the panel
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    fireEvent.click(toggleButton);

    // DevToolsPanel should be rendered
    const panel = screen.getByTestId("devtools-panel");
    expect(panel).toBeDefined();

    // Panel should display nodes from the graph
    expect(screen.getAllByText("Logger").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Database").length).toBeGreaterThan(0);
  });
});

// =============================================================================
// HexDiDevTools Production Mode Tests
// =============================================================================

describe("HexDiDevTools production mode", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders null in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");

    const diContainer = createTestContainer();

    const { container } = render(<HexDiDevTools container={diContainer} />);

    // Should render nothing (container should be empty)
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("devtools-floating-container")).toBeNull();
    expect(screen.queryByTestId("devtools-floating-toggle")).toBeNull();
  });
});

// =============================================================================
// HexDiDevTools Edge Cases
// =============================================================================

describe("HexDiDevTools edge cases", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders with empty container", () => {
    const container = createEmptyTestContainer();

    render(<HexDiDevTools container={container} />);

    // Should render the toggle button even with empty container
    expect(screen.getByTestId("devtools-floating-toggle")).toBeDefined();

    // Open the panel
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    fireEvent.click(toggleButton);

    // Panel should still be rendered
    expect(screen.getByTestId("devtools-panel")).toBeDefined();
  });

  it("default position is bottom-right when not specified", () => {
    const container = createTestContainer();

    render(<HexDiDevTools container={container} />);

    const wrapper = screen.getByTestId("devtools-floating-container");
    expect(wrapper.style.bottom).toBe("16px");
    expect(wrapper.style.right).toBe("16px");
  });
});
