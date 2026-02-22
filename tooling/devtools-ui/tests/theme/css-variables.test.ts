/**
 * Tests for CSS variable generation.
 *
 * Spec Section 43.5:
 * - CSS variables set on wrapper element
 */

import { describe, it, expect } from "vitest";
import { generateCssVariables, applyCssVariables } from "../../src/theme/css-variables.js";

describe("generateCssVariables", () => {
  it("generates CSS variables for light theme", () => {
    const vars = generateCssVariables("light");

    expect(vars["--hex-bg-primary"]).toBe("#ffffff");
    expect(vars["--hex-text-primary"]).toBe("#1a1a2e");
    expect(vars["--hex-accent"]).toBe("#6366f1");
  });

  it("generates CSS variables for dark theme", () => {
    const vars = generateCssVariables("dark");

    expect(vars["--hex-bg-primary"]).toBe("#1a1a2a");
    expect(vars["--hex-text-primary"]).toBe("#e4e4f0");
    expect(vars["--hex-accent"]).toBe("#818cf8");
  });

  it("includes shared typography tokens", () => {
    const vars = generateCssVariables("light");

    expect(vars["--hex-font-mono"]).toContain("JetBrains Mono");
    expect(vars["--hex-font-sans"]).toContain("Inter");
    expect(vars["--hex-font-size-md"]).toBe("13px");
  });

  it("includes spacing and radius tokens", () => {
    const vars = generateCssVariables("light");

    expect(vars["--hex-space-sm"]).toBe("8px");
    expect(vars["--hex-radius-md"]).toBe("6px");
    expect(vars["--hex-radius-pill"]).toBe("9999px");
  });
});

describe("applyCssVariables", () => {
  it("sets CSS custom properties on the element", () => {
    const element = document.createElement("div");
    applyCssVariables(element, "light");

    expect(element.style.getPropertyValue("--hex-bg-primary")).toBe("#ffffff");
    expect(element.style.getPropertyValue("--hex-accent")).toBe("#6366f1");
  });
});
