/**
 * Visual encoding utilities for the Result Panel.
 *
 * Pure functions for duration formatting, category-to-color/icon mapping,
 * duration bar coloring, and stability zone coloring.
 *
 * Spec: 10-visual-encoding.md Sections 10.1, 10.2, 10.7, 10.10, 10.12
 *
 * @packageDocumentation
 */

import type { ResultCategoryName } from "./types.js";

// ── Duration Formatting (Section 10.7) ──────────────────────────────────────

/**
 * Format a duration in microseconds to a human-readable string.
 *
 * | Range               | Format     | Example  |
 * |---------------------|------------|----------|
 * | < 1 us              | `<1us`     | `<1us`   |
 * | 1-999 us            | `{N}us`    | `42us`   |
 * | 1-999 ms            | `{N.D}ms`  | `1.2ms`  |
 * | 1-59 s              | `{N.D}s`   | `2.3s`   |
 * | 60+ s               | `{M}m {S}s`| `1m 23s` |
 */
export function formatDuration(microseconds: number): string {
  if (microseconds < 1) {
    return "<1us";
  }
  if (microseconds < 1_000) {
    return `${Math.round(microseconds)}us`;
  }
  const ms = microseconds / 1_000;
  if (ms < 1_000) {
    // Show 1 decimal if < 10ms, otherwise integer
    if (ms < 10) {
      return `${Number(ms.toFixed(1))}ms`;
    }
    return `${Math.round(ms)}ms`;
  }
  const seconds = microseconds / 1_000_000;
  if (seconds < 60) {
    return `${Number(seconds.toFixed(1))}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// ── Category Color Mapping (Section 10.1) ───────────────────────────────────

const CATEGORY_COLOR_MAP: Record<ResultCategoryName, string> = {
  constructor: "var(--hex-cat-constructor)",
  transformation: "var(--hex-cat-transformation)",
  chaining: "var(--hex-cat-chaining)",
  recovery: "var(--hex-cat-recovery)",
  observation: "var(--hex-cat-observation)",
  extraction: "var(--hex-cat-extraction)",
  conversion: "var(--hex-cat-conversion)",
  combinator: "var(--hex-cat-combinator)",
  generator: "var(--hex-cat-generator)",
};

/** Get the CSS custom property reference for a category color. */
export function getCategoryColor(category: ResultCategoryName): string {
  return CATEGORY_COLOR_MAP[category];
}

// ── Category Icon Mapping (Section 10.2) ────────────────────────────────────

const CATEGORY_ICON_MAP: Record<ResultCategoryName, string> = {
  constructor: "\u25C9", // ◉ filled target
  transformation: "\u27F3", // ⟳ loop arrow
  chaining: "\u2442", // ⑂ fork
  recovery: "\u21A9", // ↩ return arrow
  observation: "\uD83D\uDC41", // 👁 eye
  extraction: "\u25FC", // ◼ filled square
  conversion: "\u2197", // ↗ diagonal arrow
  combinator: "\u2295", // ⊕ circled plus
  generator: "\u2699", // ⚙ gear
};

/** Get the icon character for a category. */
export function getCategoryIcon(category: ResultCategoryName): string {
  return CATEGORY_ICON_MAP[category];
}

// ── Duration Bar Color (Section 10.10) ──────────────────────────────────────

interface DurationBarInput {
  readonly durationMicros: number;
  readonly p50: number;
  readonly p90: number;
  readonly track: "ok" | "err";
}

/** Determine the severity color for a duration bar. */
export function getDurationBarColor(input: DurationBarInput): "ok" | "warning" | "error" {
  if (input.track === "err") {
    return "error";
  }
  if (input.durationMicros > input.p90) {
    return "error";
  }
  if (input.durationMicros >= input.p50) {
    return "warning";
  }
  return "ok";
}

// ── SVG Filter & Gradient IDs ────────────────────────────────────────────────

/** SVG filter IDs used in the Railway Pipeline View. */
export const SVG_FILTER_IDS = {
  okGlow: "ok-glow",
  errGlow: "err-glow",
  particleGlow: "particle-glow",
} as const;

/** SVG arrow marker IDs used in the Railway Pipeline View. */
export const SVG_MARKER_IDS = {
  arrowOk: "arrow-ok",
  arrowErr: "arrow-err",
} as const;

/** Track colors used in the Railway Pipeline View. */
export const TRACK_COLORS = {
  ok: "#4ade80",
  err: "#f87171",
  warning: "#fbbf24",
} as const;

// ── Stability Zone Color (Section 10.12) ────────────────────────────────────

/** Determine the color zone for a stability score (0.0 - 1.0). */
export function getStabilityZoneColor(stabilityScore: number): "green" | "amber" | "red" {
  if (stabilityScore >= 0.95) {
    return "green";
  }
  if (stabilityScore >= 0.8) {
    return "amber";
  }
  return "red";
}
