/**
 * Path analysis engine for the Result Panel Case Explorer.
 *
 * Pure functions for static path enumeration, pruning, classification,
 * coverage computation, and Shannon entropy calculation.
 *
 * Spec: 06-case-explorer.md Sections 6.4, 6.6, 6.7
 *
 * @packageDocumentation
 */

import type { ResultOperationDescriptor, ResultPathDescriptor } from "./types.js";

// ── Path Enumeration (Section 6.7) ──────────────────────────────────────────

/**
 * Statically enumerate all possible paths through a Result chain.
 *
 * Pruning rules (Section 6.7):
 * - andThen/andThrough: from Ok can go Ok or Err; from Err stays Err (bypassed)
 * - orElse: from Err can go Ok or Err; from Ok stays Ok (bypassed)
 * - flip: from Ok always goes to Err; from Err always goes to Ok
 * - Non-switch ops: track stays unchanged
 */
export function computePaths(
  operations: readonly ResultOperationDescriptor[]
): readonly ResultPathDescriptor[] {
  // Each path is a sequence of tracks (one per operation)
  // We build paths by walking through operations, branching at switch points
  const results: Array<{ tracks: Array<"ok" | "err">; switchPoints: number[] }> = [];

  function enumerate(
    opIndex: number,
    currentTrack: "ok" | "err",
    tracks: Array<"ok" | "err">,
    switchPoints: number[]
  ): void {
    if (opIndex >= operations.length) {
      results.push({ tracks: [...tracks], switchPoints: [...switchPoints] });
      return;
    }

    const operation = operations[opIndex];

    if (!operation.canSwitch) {
      // Non-switching: track stays the same
      tracks.push(currentTrack);
      enumerate(opIndex + 1, currentTrack, tracks, switchPoints);
      tracks.pop();
      return;
    }

    // Switch-capable operation — apply pruning rules
    const method = operation.method;

    if (method === "flip") {
      // flip always switches: Ok->Err, Err->Ok
      const newTrack: "ok" | "err" = currentTrack === "ok" ? "err" : "ok";
      tracks.push(newTrack);
      switchPoints.push(opIndex);
      enumerate(opIndex + 1, newTrack, tracks, switchPoints);
      switchPoints.pop();
      tracks.pop();
      return;
    }

    if (method === "andThen" || method === "andThrough" || method === "asyncAndThen") {
      // From Ok: can go Ok or Err (branch)
      // From Err: bypassed, stays Err
      if (currentTrack === "err") {
        tracks.push("err");
        enumerate(opIndex + 1, "err", tracks, switchPoints);
        tracks.pop();
      } else {
        // Branch: Ok path
        tracks.push("ok");
        enumerate(opIndex + 1, "ok", tracks, switchPoints);
        tracks.pop();

        // Branch: Err path (switch)
        tracks.push("err");
        switchPoints.push(opIndex);
        enumerate(opIndex + 1, "err", tracks, switchPoints);
        switchPoints.pop();
        tracks.pop();
      }
      return;
    }

    if (method === "orElse") {
      // From Err: can go Ok or Err (branch)
      // From Ok: bypassed, stays Ok
      if (currentTrack === "ok") {
        tracks.push("ok");
        enumerate(opIndex + 1, "ok", tracks, switchPoints);
        tracks.pop();
      } else {
        // Branch: Ok path (recovery)
        tracks.push("ok");
        switchPoints.push(opIndex);
        enumerate(opIndex + 1, "ok", tracks, switchPoints);
        switchPoints.pop();
        tracks.pop();

        // Branch: Err path (stays Err)
        tracks.push("err");
        enumerate(opIndex + 1, "err", tracks, switchPoints);
        tracks.pop();
      }
      return;
    }

    // Generic switch-capable constructor (fromThrowable, fromNullable, fromPredicate, tryCatch)
    // Can go Ok or Err from any track
    tracks.push("ok");
    if (currentTrack !== "ok") {
      switchPoints.push(opIndex);
    }
    enumerate(opIndex + 1, "ok", tracks, switchPoints);
    if (currentTrack !== "ok") {
      switchPoints.pop();
    }
    tracks.pop();

    tracks.push("err");
    if (currentTrack !== "err") {
      switchPoints.push(opIndex);
    }
    enumerate(opIndex + 1, "err", tracks, switchPoints);
    if (currentTrack !== "err") {
      switchPoints.pop();
    }
    tracks.pop();
  }

  enumerate(0, "ok", [], []);

  return results.map((r, i) => ({
    pathId: `path-${i}`,
    trackSequence: r.tracks,
    switchPoints: r.switchPoints,
    observed: false,
    observedCount: 0,
    frequency: 0,
    description: describeTrackSequence(r.tracks, r.switchPoints),
  }));
}

function describeTrackSequence(
  tracks: readonly ("ok" | "err")[],
  switchPoints: readonly number[]
): string {
  if (switchPoints.length === 0) {
    const lastTrack = tracks[tracks.length - 1];
    return lastTrack === "ok" ? "Ok through all steps" : "Err through all steps";
  }
  const parts = switchPoints.map(sp => {
    const before = sp > 0 ? (tracks[sp - 1] ?? "ok") : "ok";
    const after = tracks[sp];
    return `${before === "ok" ? "Ok" : "Err"} -> ${after === "ok" ? "Ok" : "Err"} at step ${sp}`;
  });
  return parts.join(", ");
}

// ── Path Coverage (Section 6.6) ─────────────────────────────────────────────

/** Compute path coverage ratio. */
export function computePathCoverage(input: {
  readonly totalPaths: number;
  readonly observedPaths: number;
}): number {
  if (input.totalPaths === 0) {
    return 0;
  }
  return input.observedPaths / input.totalPaths;
}

// ── Path Entropy (Section 6.6) ──────────────────────────────────────────────

/**
 * Compute Shannon entropy of path distribution.
 * Higher entropy = more evenly distributed execution patterns.
 *
 * @param frequencies - Array of frequency proportions (must sum to 1.0)
 */
export function computePathEntropy(frequencies: readonly number[]): number {
  let entropy = 0;
  for (const p of frequencies) {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

// ── Path Classification (Section 6.4) ───────────────────────────────────────

export type PathClassification = "happy" | "error" | "recovery" | "multi-error";

/**
 * Classify a path based on its track sequence.
 *
 * | Classification | Criteria                        |
 * |---------------|----------------------------------|
 * | happy         | All Ok from entry to terminal    |
 * | error         | Ends on Err track at terminal    |
 * | recovery      | Has at least one Err->Ok switch  |
 * | multi-error   | Multiple Ok->Err switches        |
 */
export function classifyPath(trackSequence: readonly ("ok" | "err")[]): PathClassification {
  let okToErrCount = 0;
  let hasRecovery = false;
  let previousTrack: "ok" | "err" = "ok"; // Entry is always Ok

  for (const track of trackSequence) {
    if (previousTrack === "ok" && track === "err") {
      okToErrCount++;
    }
    if (previousTrack === "err" && track === "ok") {
      hasRecovery = true;
    }
    previousTrack = track;
  }

  if (okToErrCount >= 2) {
    return "multi-error";
  }
  if (hasRecovery) {
    return "recovery";
  }
  const finalTrack = trackSequence[trackSequence.length - 1];
  if (finalTrack === "err") {
    return "error";
  }
  return "happy";
}
