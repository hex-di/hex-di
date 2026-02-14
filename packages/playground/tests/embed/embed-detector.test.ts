/**
 * Embed Detector tests.
 *
 * Tests for the isEmbedMode() and parseEmbedOptions() functions.
 *
 * Spec Section 44.8 items 11-12:
 * 1. isEmbedMode() returns true when ?embed=true is in URL
 * 2. isEmbedMode() returns false when no embed param
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isEmbedMode, parseEmbedOptions } from "../../src/embed/embed-detector.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalLocation = window.location;

function setLocation(url: string): void {
  // jsdom allows overriding window.location via delete + define
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: new URL(url),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("isEmbedMode", () => {
  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  it("returns true when ?embed=true is in URL", () => {
    setLocation("https://playground.hex-di.dev/?embed=true");
    expect(isEmbedMode()).toBe(true);
  });

  it("returns false when no embed param is present", () => {
    setLocation("https://playground.hex-di.dev/");
    expect(isEmbedMode()).toBe(false);
  });

  it("returns false when embed param has a different value", () => {
    setLocation("https://playground.hex-di.dev/?embed=false");
    expect(isEmbedMode()).toBe(false);
  });

  it("returns true when embed=true is among other params", () => {
    setLocation("https://playground.hex-di.dev/?theme=dark&embed=true&autorun=true");
    expect(isEmbedMode()).toBe(true);
  });
});

describe("parseEmbedOptions", () => {
  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  it("parses all embed options from URL", () => {
    setLocation(
      "https://playground.hex-di.dev/?embed=true&theme=dark&panel=graph&autorun=true&readonly=true&console=show"
    );
    const opts = parseEmbedOptions();
    expect(opts.embed).toBe(true);
    expect(opts.theme).toBe("dark");
    expect(opts.panel).toBe("graph");
    expect(opts.autorun).toBe(true);
    expect(opts.readonly).toBe(true);
    expect(opts.console).toBe("show");
  });

  it("returns defaults when no params present", () => {
    setLocation("https://playground.hex-di.dev/");
    const opts = parseEmbedOptions();
    expect(opts.embed).toBe(false);
    expect(opts.theme).toBeUndefined();
    expect(opts.panel).toBeUndefined();
    expect(opts.autorun).toBe(false);
    expect(opts.readonly).toBe(false);
    expect(opts.console).toBe("hide");
  });

  it("ignores invalid theme values", () => {
    setLocation("https://playground.hex-di.dev/?theme=blue");
    const opts = parseEmbedOptions();
    expect(opts.theme).toBeUndefined();
  });
});
