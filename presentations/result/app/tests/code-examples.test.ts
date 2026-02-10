import { describe, it, expect } from "vitest";
import { example as silentSwallower } from "../src/content/code-examples/silent-swallower.js";
import { example as genericThrower } from "../src/content/code-examples/generic-thrower.js";
import { example as unsafeCast } from "../src/content/code-examples/unsafe-cast.js";
import { example as callbackPyramid } from "../src/content/code-examples/callback-pyramid.js";
import { example as successThatWasnt } from "../src/content/code-examples/success-that-wasnt.js";
import { example as booleanTrap } from "../src/content/code-examples/boolean-trap.js";
import { example as fairComparison } from "../src/content/code-examples/fair-comparison.js";
import { example as composition } from "../src/content/code-examples/composition.js";

const ALL_EXAMPLES = [
  silentSwallower,
  genericThrower,
  unsafeCast,
  callbackPyramid,
  successThatWasnt,
  booleanTrap,
  fairComparison,
  composition,
];

describe("Code Examples", () => {
  it("all 8 named examples are present", () => {
    expect(ALL_EXAMPLES).toHaveLength(8);
  });

  it("every example has a unique id", () => {
    const ids = ALL_EXAMPLES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every example has non-empty before code", () => {
    for (const example of ALL_EXAMPLES) {
      expect(example.before.code.length).toBeGreaterThan(0);
      expect(example.before.language).toBe("typescript");
    }
  });

  it("every example has non-empty after code", () => {
    for (const example of ALL_EXAMPLES) {
      expect(example.after.code.length).toBeGreaterThan(0);
      expect(example.after.language).toBe("typescript");
    }
  });

  it('every "after" example imports from @hex-di/result', () => {
    for (const example of ALL_EXAMPLES) {
      expect(example.after.code).toContain("@hex-di/result");
    }
  });

  it('no "after" example contains "any" type usage', () => {
    for (const example of ALL_EXAMPLES) {
      expect(example.after.code).not.toMatch(/:\s*any\b/);
      expect(example.after.code).not.toMatch(/as\s+any\b/);
    }
  });

  it("every example has annotations on both before and after", () => {
    for (const example of ALL_EXAMPLES) {
      expect(example.before.annotations?.length).toBeGreaterThan(0);
      expect(example.after.annotations?.length).toBeGreaterThan(0);
    }
  });

  it("expected example IDs match", () => {
    const ids = ALL_EXAMPLES.map(e => e.id);
    expect(ids).toContain("silent-swallower");
    expect(ids).toContain("generic-thrower");
    expect(ids).toContain("unsafe-cast");
    expect(ids).toContain("callback-pyramid");
    expect(ids).toContain("success-that-wasnt");
    expect(ids).toContain("boolean-trap");
    expect(ids).toContain("fair-comparison");
    expect(ids).toContain("composition");
  });
});
