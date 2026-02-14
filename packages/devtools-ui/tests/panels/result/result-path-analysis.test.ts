/**
 * Unit tests for Result Panel path analysis engine.
 *
 * Spec: 06-case-explorer.md Section 6.4, 6.6, 6.7
 */

import { describe, it, expect } from "vitest";
import {
  computePaths,
  computePathCoverage,
  computePathEntropy,
  classifyPath,
} from "../../../src/panels/result/path-analysis.js";
import type { ResultOperationDescriptor } from "../../../src/panels/result/types.js";

// ── Helper to build operation descriptors ───────────────────────────────────

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
    orElse: { inputTrack: "err", canSwitch: true, isTerminal: false },
    andThrough: { inputTrack: "ok", canSwitch: true, isTerminal: false },
    flip: { inputTrack: "both", canSwitch: true, isTerminal: false },
    inspect: { inputTrack: "ok", canSwitch: false, isTerminal: false },
    match: { inputTrack: "both", canSwitch: false, isTerminal: true },
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

// ── computePaths ────────────────────────────────────────────────────────────

describe("computePaths", () => {
  it("returns 1 path for chain with 0 switch operations", () => {
    const operations = [op(0, "map"), op(1, "map"), op(2, "match")];
    const paths = computePaths(operations);
    expect(paths).toHaveLength(1);
    // All Ok track
    expect(paths[0].trackSequence).toEqual(["ok", "ok", "ok"]);
  });

  it("returns 2 paths for chain with 1 andThen", () => {
    const operations = [op(0, "andThen"), op(1, "match")];
    const paths = computePaths(operations);
    expect(paths).toHaveLength(2);
    // Path 1: andThen succeeds (Ok->Ok), match on Ok
    // Path 2: andThen fails (Ok->Err), match on Err
    const sequences = paths.map(p => p.trackSequence);
    expect(sequences).toContainEqual(["ok", "ok"]);
    expect(sequences).toContainEqual(["err", "err"]);
  });

  it("returns 3 paths for andThen + orElse (prunes impossible)", () => {
    // andThen on Ok can go Ok or Err
    // orElse on Err can go Ok or Err; on Ok it's bypassed (stays Ok)
    const operations = [op(0, "andThen"), op(1, "orElse"), op(2, "match")];
    const paths = computePaths(operations);
    // Path 1: andThen Ok -> orElse bypassed (Ok) -> match Ok
    // Path 2: andThen Err -> orElse Ok (recovery) -> match Ok
    // Path 3: andThen Err -> orElse Err -> match Err
    // Pruned: orElse Ok->Err is impossible (orElse is bypassed on Ok)
    expect(paths).toHaveLength(3);
  });

  it("flip always switches both tracks", () => {
    const operations = [op(0, "flip"), op(1, "match")];
    const paths = computePaths(operations);
    // flip on Ok -> goes to Err; flip on Err -> goes to Ok
    // Starting from Ok: flip switches to Err -> match on Err
    // There's only one entry track (ok), so flip always switches: one path
    expect(paths).toHaveLength(1);
    expect(paths[0].trackSequence).toEqual(["err", "err"]);
  });

  it("prunes orElse Ok->Err (impossible: orElse bypassed on Ok)", () => {
    // If current track is Ok, orElse is bypassed
    const operations = [op(0, "orElse"), op(1, "match")];
    const paths = computePaths(operations);
    // Starting from Ok: orElse bypassed, stays Ok
    // Only 1 path since entry is always Ok and orElse can't switch from Ok
    expect(paths).toHaveLength(1);
    expect(paths[0].trackSequence).toEqual(["ok", "ok"]);
  });

  it("prunes andThen Err->Ok (impossible: andThen bypassed on Err)", () => {
    // This tests that if we somehow reach andThen on Err track, it stays Err
    // We need a flip first to get to Err, then andThen should be bypassed
    const operations = [op(0, "flip"), op(1, "andThen"), op(2, "match")];
    const paths = computePaths(operations);
    // flip: Ok->Err
    // andThen: bypassed on Err, stays Err
    // match: on Err
    expect(paths).toHaveLength(1);
    expect(paths[0].trackSequence).toEqual(["err", "err", "err"]);
  });

  it("returns up to 32 paths for 5 andThen operations", () => {
    const operations = [
      op(0, "andThen"),
      op(1, "andThen"),
      op(2, "andThen"),
      op(3, "andThen"),
      op(4, "andThen"),
      op(5, "match"),
    ];
    const paths = computePaths(operations);
    // Each andThen can branch on Ok, but once on Err, all subsequent are bypassed
    // So paths = 1 (all Ok) + 5 (fail at each step) = 6
    expect(paths).toHaveLength(6);
  });
});

// ── computePathCoverage ─────────────────────────────────────────────────────

describe("computePathCoverage", () => {
  it("returns correct observed/total ratio", () => {
    const result = computePathCoverage({
      totalPaths: 4,
      observedPaths: 3,
    });
    expect(result).toBeCloseTo(0.75, 5);
  });
});

// ── computePathEntropy ──────────────────────────────────────────────────────

describe("computePathEntropy", () => {
  it("returns 0 for single-path chain", () => {
    expect(computePathEntropy([1.0])).toBe(0);
  });

  it("returns max entropy for uniform distribution", () => {
    // 4 paths, each 25%
    const entropy = computePathEntropy([0.25, 0.25, 0.25, 0.25]);
    // Max entropy for 4 outcomes = log2(4) = 2
    expect(entropy).toBeCloseTo(2.0, 5);
  });
});

// ── classifyPath ────────────────────────────────────────────────────────────

describe("classifyPath", () => {
  it("returns 'happy' for all-Ok path", () => {
    expect(classifyPath(["ok", "ok", "ok"])).toBe("happy");
  });

  it("returns 'error' for terminal-Err path", () => {
    expect(classifyPath(["ok", "err", "err"])).toBe("error");
  });

  it("returns 'recovery' for path with Err->Ok switch", () => {
    expect(classifyPath(["ok", "err", "ok", "ok"])).toBe("recovery");
  });

  it("returns 'multi-error' for path with 2+ Ok->Err switches", () => {
    expect(classifyPath(["ok", "err", "ok", "err", "err"])).toBe("multi-error");
  });
});
