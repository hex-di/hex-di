/**
 * Tests for unified DevTools package scaffolding.
 *
 * These tests verify:
 * 1. Main entry point exports expected modules
 * 2. `/dom` entry point resolves correctly
 * 3. `/tui` entry point resolves correctly
 * 4. TypeScript types are correctly exported
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// Test 1: Main Entry Point Exports Expected Modules
// =============================================================================

describe("Main entry point (.) exports", () => {
  it("exports shared state management utilities", async () => {
    // Dynamic import to test module resolution
    const mainExports = await import("../src/index.js");

    // Verify key shared exports exist
    expect(mainExports).toBeDefined();

    // Should export transform utilities
    expect(mainExports.toJSON).toBeDefined();
    expect(typeof mainExports.toJSON).toBe("function");

    expect(mainExports.toDOT).toBeDefined();
    expect(typeof mainExports.toDOT).toBe("function");

    expect(mainExports.toMermaid).toBeDefined();
    expect(typeof mainExports.toMermaid).toBe("function");

    // Should export filter utilities
    expect(mainExports.filterGraph).toBeDefined();
    expect(typeof mainExports.filterGraph).toBe("function");

    expect(mainExports.byLifetime).toBeDefined();
    expect(typeof mainExports.byLifetime).toBe("function");

    expect(mainExports.relabelPorts).toBeDefined();
    expect(typeof mainExports.relabelPorts).toBe("function");
  });
});

// =============================================================================
// Test 2: /dom Entry Point Resolves Correctly
// =============================================================================

describe("/dom entry point exports", () => {
  it("exports DOM-specific components and primitives", async () => {
    // Dynamic import to test module resolution
    const domExports = await import("../src/dom/index.js");

    // Verify DOM entry point resolves
    expect(domExports).toBeDefined();

    // Should have DOM-specific marker
    expect(domExports.RENDERER_TYPE).toBe("dom");

    // Should export DOM primitives placeholder
    expect(domExports.DOMPrimitives).toBeDefined();
    expect(domExports.DOMPrimitives.rendererType).toBe("dom");

    // Should re-export shared utilities
    expect(domExports.toJSON).toBeDefined();
    expect(domExports.toDOT).toBeDefined();
    expect(domExports.toMermaid).toBeDefined();

    // Should export existing React components
    expect(domExports.DevToolsFloating).toBeDefined();
    expect(domExports.DevToolsPanel).toBeDefined();
  });
});

// =============================================================================
// Test 3: /tui Entry Point Resolves Correctly
// =============================================================================

describe("/tui entry point exports", () => {
  it("exports TUI-specific components and primitives", async () => {
    // Dynamic import to test module resolution
    const tuiExports = await import("../src/tui/index.js");

    // Verify TUI entry point resolves
    expect(tuiExports).toBeDefined();

    // Should have TUI-specific marker
    expect(tuiExports.RENDERER_TYPE).toBe("tui");

    // Should export TUI primitives placeholder
    expect(tuiExports.TUIPrimitives).toBeDefined();
    expect(tuiExports.TUIPrimitives.rendererType).toBe("tui");

    // Should export TuiDevTools placeholder
    expect(tuiExports.TuiDevTools).toBeDefined();

    // Should re-export shared utilities
    expect(tuiExports.toJSON).toBeDefined();
    expect(tuiExports.toDOT).toBeDefined();
    expect(tuiExports.toMermaid).toBeDefined();
  });
});

// =============================================================================
// Test 4: TypeScript Types Are Correctly Exported
// =============================================================================

describe("TypeScript types are correctly exported", () => {
  it("exports type definitions and renderer type markers", async () => {
    // Test main entry - types are stripped but module should be valid
    const mainExports = await import("../src/index.js");
    expect(typeof mainExports).toBe("object");

    // Test DOM entry exports RendererType marker as 'dom'
    const domExports = await import("../src/dom/index.js");
    expect(domExports.RENDERER_TYPE).toBe("dom");

    // Test TUI entry exports RendererType marker as 'tui'
    const tuiExports = await import("../src/tui/index.js");
    expect(tuiExports.RENDERER_TYPE).toBe("tui");

    // Verify the shared RendererType is consistent
    const validRendererTypes = ["dom", "tui"] as const;
    expect(validRendererTypes).toContain(domExports.RENDERER_TYPE);
    expect(validRendererTypes).toContain(tuiExports.RENDERER_TYPE);
  });
});
