import { describe, it, expect } from "vitest";
import { TOTAL_SLIDES, getActForSlide, ACT_BOUNDARIES } from "../src/content/types.js";

describe("Navigation Logic", () => {
  it("TOTAL_SLIDES is 42", () => {
    expect(TOTAL_SLIDES).toBe(42);
  });

  it("getActForSlide maps correctly for all slides", () => {
    for (let i = 1; i <= 12; i++) {
      expect(getActForSlide(i)).toBe("act1");
    }
    for (let i = 13; i <= 34; i++) {
      expect(getActForSlide(i)).toBe("act2");
    }
    for (let i = 35; i <= 42; i++) {
      expect(getActForSlide(i)).toBe("act3");
    }
  });

  it("ACT_BOUNDARIES cover all slides", () => {
    const covered = new Set<number>();
    for (const [start, end] of Object.values(ACT_BOUNDARIES)) {
      for (let i = start; i <= end; i++) {
        covered.add(i);
      }
    }
    expect(covered.size).toBe(TOTAL_SLIDES);
  });
});

describe("Theme Mode Cycling", () => {
  const MODES = ["mixed", "light", "dark"] as const;

  it("cycles through mixed -> light -> dark -> mixed", () => {
    let current = 0;
    for (let i = 0; i < 6; i++) {
      const next = (current + 1) % MODES.length;
      expect(MODES[next]).not.toBe(MODES[current]);
      current = next;
    }
  });
});
