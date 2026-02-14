/**
 * Unit tests for Result Panel pattern recognition engine.
 *
 * Spec: 12-educational-features.md Section 12.6
 */

import { describe, it, expect } from "vitest";
import {
  detectPatterns,
  type ChainPattern,
} from "../../../src/panels/result/pattern-recognition.js";
import type { ResultOperationDescriptor } from "../../../src/panels/result/types.js";

// ── Helper ──────────────────────────────────────────────────────────────────

function op(
  index: number,
  method: ResultOperationDescriptor["method"],
  overrides?: Partial<Pick<ResultOperationDescriptor, "inputTrack" | "canSwitch" | "isTerminal">>
): ResultOperationDescriptor {
  const defaults: Record<
    string,
    Pick<ResultOperationDescriptor, "inputTrack" | "canSwitch" | "isTerminal">
  > = {
    map: { inputTrack: "ok", canSwitch: false, isTerminal: false },
    mapErr: { inputTrack: "err", canSwitch: false, isTerminal: false },
    andThen: { inputTrack: "ok", canSwitch: true, isTerminal: false },
    andThrough: { inputTrack: "ok", canSwitch: true, isTerminal: false },
    orElse: { inputTrack: "err", canSwitch: true, isTerminal: false },
    inspect: { inputTrack: "ok", canSwitch: false, isTerminal: false },
    inspectErr: { inputTrack: "err", canSwitch: false, isTerminal: false },
    andTee: { inputTrack: "ok", canSwitch: false, isTerminal: false },
    orTee: { inputTrack: "err", canSwitch: false, isTerminal: false },
    match: { inputTrack: "both", canSwitch: false, isTerminal: true },
    asyncMap: { inputTrack: "ok", canSwitch: false, isTerminal: false },
    asyncAndThen: { inputTrack: "ok", canSwitch: true, isTerminal: false },
    fromPromise: { inputTrack: "both", canSwitch: true, isTerminal: false },
    fromAsyncThrowable: { inputTrack: "both", canSwitch: true, isTerminal: false },
    unwrapOr: { inputTrack: "both", canSwitch: false, isTerminal: true },
  };
  const d = defaults[method] ?? { inputTrack: "both", canSwitch: false, isTerminal: false };
  return {
    index,
    method,
    label: method,
    inputTrack: overrides?.inputTrack ?? d.inputTrack,
    outputTracks: ["ok", "err"],
    canSwitch: overrides?.canSwitch ?? d.canSwitch,
    isTerminal: overrides?.isTerminal ?? d.isTerminal,
    callbackLocation: undefined,
  };
}

function patternNames(patterns: readonly ChainPattern[]): string[] {
  return patterns.map(p => p.name);
}

// ── detectPatterns ──────────────────────────────────────────────────────────

describe("detectPatterns", () => {
  it("detects validation chain (2+ sequential andThen)", () => {
    const ops = [op(0, "andThen"), op(1, "andThen"), op(2, "andThen"), op(3, "match")];
    const patterns = detectPatterns(ops);
    expect(patternNames(patterns)).toContain("Validation Pipeline");
  });

  it("detects error recovery (orElse after andThen)", () => {
    const ops = [op(0, "andThen"), op(1, "orElse"), op(2, "match")];
    const patterns = detectPatterns(ops);
    expect(patternNames(patterns)).toContain("Error Recovery");
  });

  it("detects tap and continue (inspect between operations)", () => {
    const ops = [
      op(0, "andThen"),
      op(1, "inspect"),
      op(2, "andTee"),
      op(3, "andThen"),
      op(4, "match"),
    ];
    const patterns = detectPatterns(ops);
    expect(patternNames(patterns)).toContain("Side Effect Observer");
  });

  it("detects fallback cascade (multiple orElse)", () => {
    const ops = [op(0, "andThen"), op(1, "orElse"), op(2, "orElse"), op(3, "match")];
    const patterns = detectPatterns(ops);
    expect(patternNames(patterns)).toContain("Fallback Cascade");
  });

  it("detects async pipeline (fromPromise -> andThen -> asyncMap)", () => {
    const ops = [op(0, "fromPromise"), op(1, "andThen"), op(2, "asyncMap"), op(3, "match")];
    const patterns = detectPatterns(ops);
    expect(patternNames(patterns)).toContain("Async Processing Pipeline");
  });

  it("detects guard pattern (andThrough before andThen)", () => {
    const ops = [op(0, "andThrough"), op(1, "andThen"), op(2, "match")];
    const patterns = detectPatterns(ops);
    expect(patternNames(patterns)).toContain("Guard and Process");
  });

  it("detects safe extraction (chain ending with match)", () => {
    const ops = [op(0, "map"), op(1, "andThen"), op(2, "match")];
    const patterns = detectPatterns(ops);
    expect(patternNames(patterns)).toContain("Exhaustive Handling");
  });

  it("returns empty for chain with no recognized patterns", () => {
    // Single non-switch op + non-match terminal
    const ops = [op(0, "map"), op(1, "unwrapOr")];
    const patterns = detectPatterns(ops);
    // unwrapOr is not "match", and there's no validation chain, recovery, etc.
    expect(patternNames(patterns)).not.toContain("Validation Pipeline");
    expect(patternNames(patterns)).not.toContain("Error Recovery");
    expect(patternNames(patterns)).not.toContain("Side Effect Observer");
    expect(patternNames(patterns)).not.toContain("Fallback Cascade");
    expect(patternNames(patterns)).not.toContain("Async Processing Pipeline");
    expect(patternNames(patterns)).not.toContain("Guard and Process");
    expect(patternNames(patterns)).not.toContain("Exhaustive Handling");
  });
});
