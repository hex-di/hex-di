/**
 * EmbedMode component tests.
 *
 * Tests the compact embed layout for iframe embedding.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { EmbedMode } from "../../src/embed/embed-mode.js";
import type { EmbedOptions } from "../../src/embed/embed-detector.js";
import { createVirtualFS } from "../../src/editor/virtual-fs.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @hex-di/devtools-ui to avoid transitive DOM issues
vi.mock("@hex-di/devtools-ui", () => ({
  useResizeObserver: () => ({ width: 800, height: 600 }),
  useTheme: () => ({
    resolved: "light" as const,
    preference: "system" as const,
    setTheme: vi.fn(),
  }),
}));

// Mock the sharing module to avoid pako dependency
vi.mock("../../src/sharing/url-encoder.js", () => ({
  encodeShareableState: () => ({ success: true, encoded: "code/test" }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultOptions: EmbedOptions = {
  embed: true,
  theme: undefined,
  panel: undefined,
  autorun: false,
  readonly: false,
  console: "hide",
};

function renderEmbedMode(overrides?: Partial<EmbedOptions>) {
  const vfs = createVirtualFS();
  return render(
    <EmbedMode
      editor={<div data-testid="test-editor">Editor</div>}
      visualization={<div data-testid="test-viz">Visualization</div>}
      console={<div data-testid="test-console">Console</div>}
      status="idle"
      onRun={vi.fn()}
      virtualFS={vfs}
      activeFile="main.ts"
      options={{ ...defaultOptions, ...overrides }}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmbedMode", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the embed mode container", () => {
    const { getByTestId } = renderEmbedMode();
    expect(getByTestId("embed-mode")).toBeDefined();
  });

  it("renders the embed toolbar with Run button and Open in Playground link", () => {
    const { getByTestId } = renderEmbedMode();
    expect(getByTestId("embed-toolbar")).toBeDefined();
    expect(getByTestId("run-button")).toBeDefined();
    expect(getByTestId("open-in-playground")).toBeDefined();
  });

  it("renders theme toggle", () => {
    const { getByTestId } = renderEmbedMode();
    expect(getByTestId("theme-toggle")).toBeDefined();
  });

  it("hides console by default when console option is 'hide'", () => {
    const { queryByTestId } = renderEmbedMode({ console: "hide" });
    expect(queryByTestId("embed-console")).toBeNull();
  });

  it("shows console when console option is 'show'", () => {
    const { getByTestId } = renderEmbedMode({ console: "show" });
    expect(getByTestId("embed-console")).toBeDefined();
  });

  it("renders editor and visualization side-by-side in wide mode", () => {
    // Mock returns width=800 which is >= 600
    const { getByTestId, getByText } = renderEmbedMode();
    expect(getByTestId("embed-content")).toBeDefined();
    expect(getByText("Editor")).toBeDefined();
    expect(getByText("Visualization")).toBeDefined();
  });

  it("Open in Playground link opens in new tab", () => {
    const { getByTestId } = renderEmbedMode();
    const link = getByTestId("open-in-playground");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
