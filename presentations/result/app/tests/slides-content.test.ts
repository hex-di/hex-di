import { describe, it, expect } from "vitest";
import { slides } from "../src/content/slides.js";
import { TOTAL_SLIDES, ACT_BOUNDARIES } from "../src/content/types.js";

describe("Slide Content Completeness", () => {
  it("has exactly 36 slides", () => {
    expect(slides).toHaveLength(TOTAL_SLIDES);
  });

  it("slides are sequentially indexed 1 through 36", () => {
    slides.forEach((slide, i) => {
      expect(slide.index).toBe(i + 1);
    });
  });

  it("every slide has a non-empty title", () => {
    slides.forEach(slide => {
      expect(slide.title.length).toBeGreaterThan(0);
    });
  });

  it("every slide has presenter notes", () => {
    slides.forEach(slide => {
      expect(slide.presenterNotes.length).toBeGreaterThan(0);
    });
  });

  it("act boundaries match slide assignments", () => {
    for (const slide of slides) {
      const [start, end] = ACT_BOUNDARIES[slide.act];
      expect(slide.index).toBeGreaterThanOrEqual(start);
      expect(slide.index).toBeLessThanOrEqual(end);
    }
  });

  it("Act 1 slides 3-7 have code content (before examples)", () => {
    for (let i = 3; i <= 7; i++) {
      const slide = slides[i - 1];
      expect(slide.content?._tag).toBe("code");
    }
  });

  it("Act 2 slides 18-22 have comparison content (before/after)", () => {
    for (let i = 18; i <= 22; i++) {
      const slide = slides[i - 1];
      expect(slide.content?._tag).toBe("comparison");
    }
  });

  it("title slides use dark background", () => {
    const titleSlides = slides.filter(s => s.type === "title");
    expect(titleSlides.length).toBeGreaterThan(0);
    for (const slide of titleSlides) {
      expect(slide.background).toBe("dark");
    }
  });

  it("impact slides use dark background", () => {
    const impactSlides = slides.filter(s => s.type === "impact");
    expect(impactSlides.length).toBeGreaterThan(0);
    for (const slide of impactSlides) {
      expect(slide.background).toBe("dark");
    }
  });
});
