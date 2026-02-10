import { describe, it, expect } from "vitest";
import { slides } from "../src/content/slides.js";
import { TOTAL_SLIDES } from "../src/content/types.js";

describe("Quality Gates", () => {
  it("all slides exist with sequential indices", () => {
    expect(slides).toHaveLength(TOTAL_SLIDES);
    slides.forEach((slide, i) => {
      expect(slide.index).toBe(i + 1);
    });
  });

  it("every slide definition has a valid type", () => {
    const validTypes = new Set(["title", "content", "code", "split", "diagram", "impact"]);
    for (const slide of slides) {
      expect(validTypes.has(slide.type)).toBe(true);
    }
  });

  it("all slides have non-empty presenter notes", () => {
    for (const slide of slides) {
      expect(
        slide.presenterNotes.trim().length,
        `Slide ${slide.index} missing presenter notes`
      ).toBeGreaterThan(0);
    }
  });

  it("every slide has a valid background", () => {
    const validBackgrounds = new Set(["dark", "light", "white"]);
    for (const slide of slides) {
      expect(
        validBackgrounds.has(slide.background),
        `Slide ${slide.index} has invalid background: ${slide.background}`
      ).toBe(true);
    }
  });

  it("every slide has a valid act assignment", () => {
    const validActs = new Set(["act1", "act2", "act3"]);
    for (const slide of slides) {
      expect(validActs.has(slide.act), `Slide ${slide.index} has invalid act: ${slide.act}`).toBe(
        true
      );
    }
  });

  it("content slides have content", () => {
    const contentSlides = slides.filter(s => s.type !== "title" && s.type !== "impact");
    for (const slide of contentSlides) {
      expect(slide.content, `Slide ${slide.index} (${slide.type}) missing content`).toBeDefined();
    }
  });
});
