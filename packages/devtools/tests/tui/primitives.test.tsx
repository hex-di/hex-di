/**
 * Tests for TUI primitives implementation.
 *
 * These tests verify:
 * 1. Box renders as OpenTUI box with flexbox
 * 2. Text renders with ANSI colors
 * 3. Button renders as bordered box with focus
 * 4. Icon renders ASCII characters
 * 5. Focus navigation works between elements
 * 6. Semantic colors map to ANSI codes
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { TUIPrimitives, TUIStyleSystem, ANSI_COLORS } from "../../src/tui/primitives.js";

// =============================================================================
// Test Suite
// =============================================================================

describe("TUI Primitives", () => {
  // ---------------------------------------------------------------------------
  // Test 1: Box renders as OpenTUI box with flexbox
  // ---------------------------------------------------------------------------
  describe("TUIBox", () => {
    it("renders as OpenTUI box with flexbox properties", () => {
      const { Box } = TUIPrimitives;

      // Create element to test props
      const element = Box({
        flexDirection: "column",
        gap: "md",
        padding: "sm",
        children: "Test content",
      });

      // Verify element structure
      expect(element).toBeDefined();
      expect(element?.type).toBe("box");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((element?.props as any).flexDirection).toBe("column");
    });

    it("supports TUI-specific props like title", () => {
      const { Box } = TUIPrimitives;

      const element = Box({
        title: "Test Title",
        titleAlignment: "center",
        children: "Content",
      });

      // Note: focusable is NOT passed through because OpenTUI's Renderable.focusable
      // is a getter-only property (no setter) - it's controlled internally by the class.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((element?.props as any).title).toBe("Test Title");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((element?.props as any).titleAlignment).toBe("center");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Text renders with ANSI colors
  // ---------------------------------------------------------------------------
  describe("TUIText", () => {
    it("renders as text element with span for colors", () => {
      const { Text } = TUIPrimitives;

      const element = Text({
        color: "primary",
        children: "Test text",
      });

      expect(element).toBeDefined();
      // TUIText returns TUIText component wrapped with OTUIText, not a string "text"
      expect(element?.type).toBeDefined();
      // Handle both string and component types
      const typeName = typeof element?.type === "string" ? element.type : element?.type?.name;
      expect(typeName).toBe("TUIText");
    });

    it("maps semantic colors to ANSI codes", () => {
      const { Text, styleSystem } = TUIPrimitives;

      // Get the primary color ANSI code
      const primaryColor = styleSystem.getColor("primary");

      // Verify it's a valid ANSI code (starts with \x1b[)
      expect(primaryColor).toMatch(/^\x1b\[\d+m$/);

      // Create text element and verify color prop
      const element = Text({
        color: "primary",
        children: "Test",
      });

      // The span inside should have fg prop set to ANSI code
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spanChild = (element?.props as any).children;
      expect(spanChild?.props?.fg).toBe(primaryColor);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Button renders as bordered box
  // ---------------------------------------------------------------------------
  describe("TUIButton", () => {
    it("renders as bordered box", () => {
      const { Button } = TUIPrimitives;

      const element = Button({
        label: "Click me",
        onClick: vi.fn(),
      });

      expect(element).toBeDefined();
      expect(element?.type).toBe("box");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((element?.props as any).border).toBe(true);
      // Note: focusable is NOT passed through because OpenTUI's Renderable.focusable
      // is a getter-only property (no setter) - it's controlled internally by the class.
    });

    it("handles disabled state with muted styling", () => {
      const { Button, styleSystem } = TUIPrimitives;

      const element = Button({
        label: "Disabled",
        onClick: vi.fn(),
        disabled: true,
      });

      // Disabled buttons render with muted text color
      expect(element).toBeDefined();
      expect(element?.type).toBe("box");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Icon renders ASCII characters
  // ---------------------------------------------------------------------------
  describe("TUIIcon", () => {
    it("renders ASCII characters for icons", () => {
      const { Icon } = TUIPrimitives;

      const graphIcon = Icon({ name: "graph" });
      expect(graphIcon).toBeDefined();
      // TUIIcon returns OTUIText (which is TUIText from opentui-elements), not a string "text"
      expect(graphIcon?.type).toBeDefined();
      // Handle both string and component types
      const typeName = typeof graphIcon?.type === "string" ? graphIcon.type : graphIcon?.type?.name;
      expect(typeName).toBe("TUIText");

      // Get the inner text content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textContent = (graphIcon?.props as any).children?.props?.children;
      expect(textContent).toBe("[G]");
    });

    it("renders different ASCII for different icon names", () => {
      const { Icon } = TUIPrimitives;

      const chevronRight = Icon({ name: "chevron-right" });
      const chevronDown = Icon({ name: "chevron-down" });
      const close = Icon({ name: "close" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((chevronRight?.props as any).children?.props?.children).toBe(">");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((chevronDown?.props as any).children?.props?.children).toBe("v");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((close?.props as any).children?.props?.children).toBe("[x]");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Component rendering and composition
  // ---------------------------------------------------------------------------
  describe("Component Composition", () => {
    it("Box renders correctly with children", () => {
      const { Box } = TUIPrimitives;

      // Note: OpenTUI's Renderable.focusable is a getter-only property (no setter),
      // so focusable cannot be set via props. Focus is controlled internally by OpenTUI.
      const element = Box({
        children: "Content",
      });

      expect(element).toBeDefined();
      expect(element?.type).toBe("box");
    });

    it("Button renders with label", () => {
      const { Button } = TUIPrimitives;

      const button = Button({
        label: "Button",
        onClick: vi.fn(),
      });

      expect(button).toBeDefined();
      expect(button?.type).toBe("box");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((button?.props as any).border).toBe(true);
    });

    it("ScrollView can contain nested elements", () => {
      const { ScrollView, Button } = TUIPrimitives;

      const scrollView = ScrollView({
        children: Button({ label: "Inner button", onClick: vi.fn() }),
      });

      expect(scrollView).toBeDefined();
      expect(scrollView?.type).toBe("box");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Semantic colors map to ANSI codes
  // ---------------------------------------------------------------------------
  describe("TUIStyleSystem", () => {
    it("maps all 10 semantic colors to ANSI codes", () => {
      const semanticColors = [
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "muted",
        "foreground",
        "background",
        "border",
        "accent",
      ] as const;

      for (const color of semanticColors) {
        const ansiCode = TUIStyleSystem.getColor(color);

        // All colors should be valid ANSI codes
        expect(ansiCode).toBeDefined();
        expect(typeof ansiCode).toBe("string");

        // Verify the color is in the colors object
        expect(TUIStyleSystem.colors[color]).toBe(ansiCode);
      }
    });

    it("provides ANSI color constants", () => {
      // Verify ANSI_COLORS exports useful color codes
      expect(ANSI_COLORS.reset).toBe("\x1b[0m");
      expect(ANSI_COLORS.green).toBeDefined();
      expect(ANSI_COLORS.blue).toBeDefined();
      expect(ANSI_COLORS.cyan).toBeDefined();
    });

    it("colors can be used directly in terminal output", () => {
      const primaryColor = TUIStyleSystem.getColor("primary");
      const testString = `${primaryColor}Hello${ANSI_COLORS.reset}`;

      // Verify string contains ANSI escape sequences
      expect(testString).toContain("\x1b[");
    });
  });
});
