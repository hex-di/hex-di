/**
 * Tests for DOM primitives implementation.
 *
 * These tests verify:
 * 1. Box renders as div with flexbox styles
 * 2. Text renders with semantic color CSS variables
 * 3. Button renders with click handler
 * 4. Icon renders correct unicode/SVG
 * 5. ScrollView enables overflow scrolling
 * 6. Semantic colors map to CSS custom properties
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import React from "react";
import {
  DOMPrimitives,
  DOMStyleSystem,
} from "../../src/dom/primitives.js";

// =============================================================================
// Test Suite
// =============================================================================

describe("DOM Primitives", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Box renders as div with flexbox styles
  // ---------------------------------------------------------------------------
  it("Box renders as div with flexbox styles", () => {
    const { Box } = DOMPrimitives;

    render(
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="flex-start"
        gap="md"
        paddingX="sm"
        data-testid="test-box"
      >
        <span>Child content</span>
      </Box>
    );

    const boxElement = screen.getByTestId("test-box");
    expect(boxElement.tagName).toBe("DIV");

    // Verify flexbox styles are applied via getAttribute (more reliable with JSDOM)
    const styleAttr = boxElement.getAttribute("style") ?? "";
    expect(styleAttr).toContain("display: flex");
    expect(styleAttr).toContain("flex-direction: column");
    expect(styleAttr).toContain("justify-content: center");
    expect(styleAttr).toContain("align-items: flex-start");
    expect(styleAttr).toContain("gap: 20px"); // md = 20px (enhanced spacing)
    // Note: paddingX sets padding-left and padding-right individually
    expect(styleAttr).toContain("padding-left: 12px"); // sm = 12px (enhanced spacing)
    expect(styleAttr).toContain("padding-right: 12px");
  });

  // ---------------------------------------------------------------------------
  // Test 2: Text renders with semantic color CSS variables
  // ---------------------------------------------------------------------------
  it("Text renders with semantic color CSS variables", () => {
    const { Text } = DOMPrimitives;

    render(
      <Text color="primary" variant="heading" data-testid="test-text">
        Hello World
      </Text>
    );

    const textElement = screen.getByTestId("test-text");
    expect(textElement.tagName).toBe("SPAN");
    expect(textElement.textContent).toBe("Hello World");

    // Verify CSS variable is used for color
    const styleAttr = textElement.getAttribute("style") ?? "";
    expect(styleAttr).toContain("color: var(--hex-devtools-primary)");
  });

  // ---------------------------------------------------------------------------
  // Test 3: Button renders with click handler
  // ---------------------------------------------------------------------------
  it("Button renders with click handler", () => {
    const { Button } = DOMPrimitives;
    const handleClick = vi.fn();

    render(
      <Button label="Click Me" onClick={handleClick} data-testid="test-button" />
    );

    const buttonElement = screen.getByTestId("test-button");
    expect(buttonElement.tagName).toBe("BUTTON");
    expect(buttonElement.textContent).toBe("Click Me");

    // Click the button
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Icon renders correct unicode/SVG
  // ---------------------------------------------------------------------------
  it("Icon renders correct unicode character", () => {
    const { Icon } = DOMPrimitives;

    render(<Icon name="graph" size="md" color="primary" />);

    // The icon should render a span with the appropriate unicode or text
    const iconElement = document.querySelector('[data-icon="graph"]');
    expect(iconElement).toBeTruthy();
    expect(iconElement?.textContent).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Test 5: ScrollView enables overflow scrolling
  // ---------------------------------------------------------------------------
  it("ScrollView enables overflow scrolling", () => {
    const { ScrollView } = DOMPrimitives;

    const { container } = render(
      <ScrollView vertical horizontal maxHeight={200}>
        <div style={{ height: 500 }}>Tall content</div>
      </ScrollView>
    );

    const scrollElement = container.firstChild as HTMLElement;
    const styleAttr = scrollElement.getAttribute("style") ?? "";
    expect(styleAttr).toContain("overflow-y: auto");
    expect(styleAttr).toContain("overflow-x: auto");
    expect(styleAttr).toContain("max-height: 200px");
  });

  // ---------------------------------------------------------------------------
  // Test 6: Semantic colors map to CSS custom properties
  // ---------------------------------------------------------------------------
  it("Semantic colors map to CSS custom properties", () => {
    // Verify all 10 semantic colors are mapped correctly
    // Note: Semantic colors may map to different CSS variable names
    type SemanticColor =
      | "primary"
      | "secondary"
      | "success"
      | "warning"
      | "error"
      | "muted"
      | "foreground"
      | "background"
      | "border"
      | "accent";

    const expectedMappings: Record<SemanticColor, string> = {
      primary: "var(--hex-devtools-primary)",
      secondary: "var(--hex-devtools-accent)",
      success: "var(--hex-devtools-success)",
      warning: "var(--hex-devtools-warning)",
      error: "var(--hex-devtools-error)",
      muted: "var(--hex-devtools-text-muted)",
      foreground: "var(--hex-devtools-text)",
      background: "var(--hex-devtools-bg)",
      border: "var(--hex-devtools-border)",
      accent: "var(--hex-devtools-primary-hover)",
    };

    // Verify getColor returns correct CSS variables
    const colors: SemanticColor[] = [
      "primary", "secondary", "success", "warning", "error",
      "muted", "foreground", "background", "border", "accent"
    ];

    for (const color of colors) {
      const cssValue = DOMStyleSystem.getColor(color);
      expect(cssValue).toBe(expectedMappings[color]);
    }

    // Verify colors object contains all 10 colors
    expect(Object.keys(DOMStyleSystem.colors)).toHaveLength(10);

    // Verify colors object values match expected mappings
    for (const color of colors) {
      expect(DOMStyleSystem.colors[color]).toBe(expectedMappings[color]);
    }
  });
});
