/**
 * Tests for DOM entry point.
 *
 * These tests verify:
 * 1. FloatingDevTools renders in corner position
 * 2. FloatingDevTools supports all 4 positions
 * 3. Resize handles work
 * 4. Fullscreen toggle works
 * 5. Production mode hides panel
 * 6. LocalStorage persistence works
 */

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import React from "react";
import { FloatingDevTools } from "../../src/dom/FloatingDevTools.js";
import { DOMDevToolsProvider } from "../../src/dom/DOMDevToolsProvider.js";
import { createEmptyPanelViewModel } from "../../src/view-models/index.js";

// =============================================================================
// Mock Graph
// =============================================================================

/**
 * Creates a mock Graph object for FloatingDevTools tests.
 *
 * This mimics the real Graph structure with adapters array
 * that toJSON() expects.
 */
function createMockGraph(): unknown {
  // Create mock ports
  const loggerPort = { __portName: "Logger" };
  const userServicePort = { __portName: "UserService" };

  // Create mock adapters array (what toJSON iterates over)
  const adapters = [
    {
      provides: loggerPort,
      requires: [],
      lifetime: "singleton" as const,
      factoryKind: "sync" as const,
    },
    {
      provides: userServicePort,
      requires: [loggerPort],
      lifetime: "scoped" as const,
      factoryKind: "sync" as const,
    },
  ];

  // Return mock Graph object
  return {
    adapters,
    // Add any other Graph properties that might be accessed
  };
}

// =============================================================================
// Mock localStorage
// =============================================================================

const localStorageMock = (() => {
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
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// =============================================================================
// Mock WebSocket (FloatingDevTools connects to relay)
// =============================================================================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(_url: string) {
    // Don't auto-connect - let tests control this
  }

  send(_data: string): void {
    // Mock send - do nothing
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  }
}

vi.stubGlobal("WebSocket", MockWebSocket);

// =============================================================================
// Test Suite
// =============================================================================

describe("DOM Entry Point", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: FloatingDevTools renders in corner position
  // ---------------------------------------------------------------------------
  it("FloatingDevTools renders in corner position", () => {
    const graph = createMockGraph();

    render(
      <FloatingDevTools graph={graph as never} position="bottom-right" />
    );

    // Should render the container
    const container = screen.getByTestId("floating-devtools-container");
    expect(container).toBeTruthy();

    // Verify bottom-right positioning
    const style = container.getAttribute("style") ?? "";
    expect(style).toContain("position: fixed");
    expect(style).toContain("bottom: 16px");
    expect(style).toContain("right: 16px");
  });

  // ---------------------------------------------------------------------------
  // Test 2: FloatingDevTools supports all 4 positions
  // ---------------------------------------------------------------------------
  it("FloatingDevTools supports all 4 positions", () => {
    const graph = createMockGraph();

    // Test each position
    const positions = [
      { position: "bottom-right" as const, bottom: true, right: true },
      { position: "bottom-left" as const, bottom: true, left: true },
      { position: "top-right" as const, top: true, right: true },
      { position: "top-left" as const, top: true, left: true },
    ];

    for (const { position, top, bottom, left, right } of positions) {
      cleanup();

      render(
        <FloatingDevTools graph={graph as never} position={position} />
      );

      const container = screen.getByTestId("floating-devtools-container");
      const style = container.getAttribute("style") ?? "";

      if (top) expect(style).toContain("top:");
      if (bottom) expect(style).toContain("bottom:");
      if (left) expect(style).toContain("left:");
      if (right) expect(style).toContain("right:");
    }
  });

  // ---------------------------------------------------------------------------
  // Test 3: Resize handles work (when panel is open)
  // ---------------------------------------------------------------------------
  it("Resize handles work", () => {
    const graph = createMockGraph();

    // Pre-set localStorage to have panel open
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "hex-devtools-open") return "true";
      return null;
    });

    render(<FloatingDevTools graph={graph as never} position="bottom-right" />);

    // Find the resize handle (corner)
    const resizeHandle = screen.queryByTestId("floating-devtools-resize-corner");
    expect(resizeHandle).toBeTruthy();

    // Verify resize handles are present
    expect(screen.queryByTestId("floating-devtools-resize-corner")).toBeTruthy();
    expect(screen.queryByTestId("floating-devtools-resize-top")).toBeTruthy();
    expect(screen.queryByTestId("floating-devtools-resize-bottom")).toBeTruthy();
    expect(screen.queryByTestId("floating-devtools-resize-left")).toBeTruthy();
    expect(screen.queryByTestId("floating-devtools-resize-right")).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Test 4: Fullscreen toggle works
  // ---------------------------------------------------------------------------
  it("Fullscreen toggle works", () => {
    const graph = createMockGraph();
    const onToggleFullscreen = vi.fn();

    // Pre-set localStorage to have panel open
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "hex-devtools-open") return "true";
      return null;
    });

    render(
      <FloatingDevTools
        graph={graph as never}
        position="bottom-right"
        onToggleFullscreen={onToggleFullscreen}
      />
    );

    // Find and click fullscreen button
    const fullscreenButton = screen.getByTestId("floating-devtools-fullscreen");
    expect(fullscreenButton).toBeTruthy();

    fireEvent.click(fullscreenButton);
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Test 5: Production mode hides panel
  // ---------------------------------------------------------------------------
  it("Production mode hides panel", () => {
    // Save original NODE_ENV
    const originalEnv = process.env['NODE_ENV'];

    try {
      // Set production mode
      process.env['NODE_ENV'] = "production";

      const graph = createMockGraph();

      const { container } = render(
        <FloatingDevTools graph={graph as never} position="bottom-right" />
      );

      // In production mode, nothing should render
      expect(container.firstChild).toBeNull();
    } finally {
      // Restore NODE_ENV
      process.env['NODE_ENV'] = originalEnv;
    }
  });

  // ---------------------------------------------------------------------------
  // Test 6: LocalStorage persistence works
  // ---------------------------------------------------------------------------
  it("LocalStorage persistence works", () => {
    const graph = createMockGraph();
    const onOpenChange = vi.fn();

    // Render and toggle open state
    render(
      <FloatingDevTools
        graph={graph as never}
        position="bottom-right"
        onOpenChange={onOpenChange}
        persistKey="hex-devtools-test"
      />
    );

    // Click toggle button to open
    const toggleButton = screen.getByTestId("floating-devtools-toggle");
    fireEvent.click(toggleButton);

    // Should have called onOpenChange
    expect(onOpenChange).toHaveBeenCalledWith(true);

    // Should persist to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "hex-devtools-test-open",
      "true"
    );
  });

  // ---------------------------------------------------------------------------
  // DOMDevToolsProvider Tests
  // ---------------------------------------------------------------------------
  describe("DOMDevToolsProvider", () => {
    it("provides primitives context to children", () => {
      // DOMDevToolsProvider wraps children with PrimitivesProvider
      render(
        <DOMDevToolsProvider>
          <div data-testid="child">Child content</div>
        </DOMDevToolsProvider>
      );

      // Should render without error
      const child = screen.getByTestId("child");
      expect(child).toBeTruthy();
    });

    it("accepts custom data source", () => {
      const mockDataSource = {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getState: vi.fn(() => createEmptyPanelViewModel()),
      };

      render(
        <DOMDevToolsProvider dataSource={mockDataSource}>
          <div data-testid="child">Child content</div>
        </DOMDevToolsProvider>
      );

      const child = screen.getByTestId("child");
      expect(child).toBeTruthy();
    });
  });
});
