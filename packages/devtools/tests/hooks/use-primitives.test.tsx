/**
 * Tests for usePrimitives hook.
 *
 * These tests verify:
 * 1. Hook returns all primitive components
 * 2. Hook throws if no provider present
 * 3. Hook returns correct renderer type
 * 4. Hook memoizes primitives correctly
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, renderHook } from "@testing-library/react";
import React from "react";
import type { RenderPrimitives, RendererType } from "../../src/ports/render-primitives.port.js";
import { PrimitivesProvider } from "../../src/hooks/primitives-context.js";
import { usePrimitives } from "../../src/hooks/use-primitives.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a mock RenderPrimitives object for testing.
 *
 * @param rendererType - The renderer type to use
 * @returns Mock RenderPrimitives object
 */
function createMockPrimitives<R extends RendererType>(
  rendererType: R
): RenderPrimitives<R> {
  return {
    rendererType,
    Box: vi.fn(() => null),
    Text: vi.fn(() => null),
    Button: vi.fn(() => null),
    Icon: vi.fn(() => null),
    ScrollView: vi.fn(() => null),
    Divider: vi.fn(() => null),
    GraphRenderer: vi.fn(() => null),
    FlameGraph: vi.fn(() => null),
    TimelineScrubber: vi.fn(() => null),
    DiffView: vi.fn(() => null),
    ContainerTree: vi.fn(() => null),
    PerformanceBadge: vi.fn(() => null),
    styleSystem: {
      getColor: vi.fn((color) => `mock-${color}`),
      colors: {
        primary: "#007acc",
        secondary: "#6c757d",
        success: "#28a745",
        warning: "#ffc107",
        error: "#dc3545",
        muted: "#6c757d",
        foreground: "#212529",
        background: "#ffffff",
        border: "#dee2e6",
        accent: "#17a2b8",
      },
    },
  } as RenderPrimitives<R>;
}

// =============================================================================
// Test Suite
// =============================================================================

describe("usePrimitives", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Hook returns all primitive components
  // ---------------------------------------------------------------------------
  it("returns all primitive components", () => {
    const mockPrimitives = createMockPrimitives("dom");

    const { result } = renderHook(() => usePrimitives(), {
      wrapper: ({ children }) => (
        <PrimitivesProvider primitives={mockPrimitives}>
          {children}
        </PrimitivesProvider>
      ),
    });

    // Verify all primitive components are returned
    expect(result.current.Box).toBeDefined();
    expect(result.current.Text).toBeDefined();
    expect(result.current.Button).toBeDefined();
    expect(result.current.Icon).toBeDefined();
    expect(result.current.ScrollView).toBeDefined();
    expect(result.current.Divider).toBeDefined();
    expect(result.current.GraphRenderer).toBeDefined();
    expect(result.current.styleSystem).toBeDefined();

    // Verify they are the same functions from the mock
    expect(result.current.Box).toBe(mockPrimitives.Box);
    expect(result.current.Text).toBe(mockPrimitives.Text);
    expect(result.current.Button).toBe(mockPrimitives.Button);
    expect(result.current.styleSystem).toBe(mockPrimitives.styleSystem);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Hook throws if no provider present
  // ---------------------------------------------------------------------------
  it("throws if no provider present", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => usePrimitives());
    }).toThrow("usePrimitives must be used within a PrimitivesProvider");

    consoleSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Test 3: Hook returns correct renderer type
  // ---------------------------------------------------------------------------
  it("returns correct renderer type for DOM", () => {
    const mockDOMPrimitives = createMockPrimitives("dom");

    const { result } = renderHook(() => usePrimitives(), {
      wrapper: ({ children }) => (
        <PrimitivesProvider primitives={mockDOMPrimitives}>
          {children}
        </PrimitivesProvider>
      ),
    });

    expect(result.current.rendererType).toBe("dom");
  });

  it("returns correct renderer type for TUI", () => {
    const mockTUIPrimitives = createMockPrimitives("tui");

    const { result } = renderHook(() => usePrimitives(), {
      wrapper: ({ children }) => (
        <PrimitivesProvider primitives={mockTUIPrimitives}>
          {children}
        </PrimitivesProvider>
      ),
    });

    expect(result.current.rendererType).toBe("tui");
  });

  // ---------------------------------------------------------------------------
  // Test 4: Hook memoizes primitives correctly
  // ---------------------------------------------------------------------------
  it("memoizes primitives correctly", () => {
    const mockPrimitives = createMockPrimitives("dom");

    const { result, rerender } = renderHook(() => usePrimitives(), {
      wrapper: ({ children }) => (
        <PrimitivesProvider primitives={mockPrimitives}>
          {children}
        </PrimitivesProvider>
      ),
    });

    const firstResult = result.current;

    // Re-render the hook
    rerender();

    const secondResult = result.current;

    // The primitives object should be the same reference (memoized)
    expect(secondResult).toBe(firstResult);
  });
});
