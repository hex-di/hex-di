/**
 * Path analysis engine for the Guard Panel Policy Path Explorer.
 *
 * Pure functions for static path enumeration through policy trees,
 * with AllOf/AnyOf/Not short-circuit semantics.
 *
 * Spec: 06-policy-path-explorer.md Sections 6.4, 6.6, 6.7
 *
 * @packageDocumentation
 */

import type { GuardPathDescriptor, PolicyNodeDescriptor } from "./types.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of paths before enumeration is halted. */
export const PATH_EXPLOSION_LIMIT = 256;

// ── Path Enumeration (Section 6.7) ───────────────────────────────────────────

interface PathEntry {
  readonly nodeIds: string[];
  readonly nodeOutcomes: ("allow" | "deny" | "skip")[];
  readonly finalOutcome: "allow" | "deny";
}

/**
 * Statically enumerate all possible paths through a policy tree.
 *
 * Semantics:
 * - AllOf: all children must allow; stops on first deny (rest get "skip")
 * - AnyOf: any child can allow; stops on first allow (rest get "skip")
 * - Not: inverts child outcome
 * - Labeled: delegates to wrapped policy
 * - Leaves: either "allow" or "deny"
 */
export function enumeratePaths(
  rootNode: PolicyNodeDescriptor,
  descriptorId: string
): readonly GuardPathDescriptor[] {
  const results: PathEntry[] = [];
  enumerateNode(rootNode, results);

  if (results.length > PATH_EXPLOSION_LIMIT) {
    return results
      .slice(0, PATH_EXPLOSION_LIMIT)
      .map((entry, i) => buildPathDescriptor(entry, descriptorId, i));
  }

  return results.map((entry, i) => buildPathDescriptor(entry, descriptorId, i));
}

function enumerateNode(node: PolicyNodeDescriptor, results: PathEntry[]): void {
  if (results.length >= PATH_EXPLOSION_LIMIT) {
    return;
  }

  const kind = node.kind;

  if (kind === "allOf") {
    enumerateAllOf(node, results);
  } else if (kind === "anyOf") {
    enumerateAnyOf(node, results);
  } else if (kind === "not") {
    enumerateNot(node, results);
  } else if (kind === "labeled") {
    enumerateLabeled(node, results);
  } else {
    // Leaf node: two outcomes
    results.push({
      nodeIds: [node.nodeId],
      nodeOutcomes: ["allow"],
      finalOutcome: "allow",
    });
    results.push({
      nodeIds: [node.nodeId],
      nodeOutcomes: ["deny"],
      finalOutcome: "deny",
    });
  }
}

function enumerateAllOf(node: PolicyNodeDescriptor, results: PathEntry[]): void {
  const children = node.children;

  if (children.length === 0) {
    results.push({
      nodeIds: [node.nodeId],
      nodeOutcomes: ["allow"],
      finalOutcome: "allow",
    });
    return;
  }

  // AllOf: all must allow. Short-circuit on first deny.
  // Path 1: all children allow → allow
  // Path 2..N: child i denies, rest skipped → deny
  enumerateAllOfRecursive(node, children, 0, [], [], results);
}

function enumerateAllOfRecursive(
  parent: PolicyNodeDescriptor,
  children: readonly PolicyNodeDescriptor[],
  childIndex: number,
  nodeIds: string[],
  nodeOutcomes: ("allow" | "deny" | "skip")[],
  results: PathEntry[]
): void {
  if (results.length >= PATH_EXPLOSION_LIMIT) return;

  if (childIndex >= children.length) {
    // All children allowed
    results.push({
      nodeIds: [parent.nodeId, ...nodeIds],
      nodeOutcomes: ["allow", ...nodeOutcomes],
      finalOutcome: "allow",
    });
    return;
  }

  const child = children[childIndex];

  // Branch: child allows → continue to next
  const childPaths: PathEntry[] = [];
  enumerateNode(child, childPaths);

  for (const childPath of childPaths) {
    if (results.length >= PATH_EXPLOSION_LIMIT) return;

    if (childPath.finalOutcome === "allow") {
      // Child allows, continue
      enumerateAllOfRecursive(
        parent,
        children,
        childIndex + 1,
        [...nodeIds, ...childPath.nodeIds],
        [...nodeOutcomes, ...childPath.nodeOutcomes],
        results
      );
    } else {
      // Child denies → short-circuit: remaining children get "skip"
      const skipIds: string[] = [];
      const skipOutcomes: ("allow" | "deny" | "skip")[] = [];
      for (let j = childIndex + 1; j < children.length; j++) {
        skipIds.push(children[j].nodeId);
        skipOutcomes.push("skip");
      }

      results.push({
        nodeIds: [parent.nodeId, ...nodeIds, ...childPath.nodeIds, ...skipIds],
        nodeOutcomes: ["deny", ...nodeOutcomes, ...childPath.nodeOutcomes, ...skipOutcomes],
        finalOutcome: "deny",
      });
    }
  }
}

function enumerateAnyOf(node: PolicyNodeDescriptor, results: PathEntry[]): void {
  const children = node.children;

  if (children.length === 0) {
    results.push({
      nodeIds: [node.nodeId],
      nodeOutcomes: ["deny"],
      finalOutcome: "deny",
    });
    return;
  }

  // AnyOf: any child can allow. Short-circuit on first allow.
  enumerateAnyOfRecursive(node, children, 0, [], [], results);
}

function enumerateAnyOfRecursive(
  parent: PolicyNodeDescriptor,
  children: readonly PolicyNodeDescriptor[],
  childIndex: number,
  nodeIds: string[],
  nodeOutcomes: ("allow" | "deny" | "skip")[],
  results: PathEntry[]
): void {
  if (results.length >= PATH_EXPLOSION_LIMIT) return;

  if (childIndex >= children.length) {
    // All children denied
    results.push({
      nodeIds: [parent.nodeId, ...nodeIds],
      nodeOutcomes: ["deny", ...nodeOutcomes],
      finalOutcome: "deny",
    });
    return;
  }

  const child = children[childIndex];

  const childPaths: PathEntry[] = [];
  enumerateNode(child, childPaths);

  for (const childPath of childPaths) {
    if (results.length >= PATH_EXPLOSION_LIMIT) return;

    if (childPath.finalOutcome === "deny") {
      // Child denies, continue to next
      enumerateAnyOfRecursive(
        parent,
        children,
        childIndex + 1,
        [...nodeIds, ...childPath.nodeIds],
        [...nodeOutcomes, ...childPath.nodeOutcomes],
        results
      );
    } else {
      // Child allows → short-circuit: remaining children get "skip"
      const skipIds: string[] = [];
      const skipOutcomes: ("allow" | "deny" | "skip")[] = [];
      for (let j = childIndex + 1; j < children.length; j++) {
        skipIds.push(children[j].nodeId);
        skipOutcomes.push("skip");
      }

      results.push({
        nodeIds: [parent.nodeId, ...nodeIds, ...childPath.nodeIds, ...skipIds],
        nodeOutcomes: ["allow", ...nodeOutcomes, ...childPath.nodeOutcomes, ...skipOutcomes],
        finalOutcome: "allow",
      });
    }
  }
}

function enumerateNot(node: PolicyNodeDescriptor, results: PathEntry[]): void {
  const child = node.children[0];
  if (!child) {
    results.push({
      nodeIds: [node.nodeId],
      nodeOutcomes: ["deny"],
      finalOutcome: "deny",
    });
    return;
  }

  const childPaths: PathEntry[] = [];
  enumerateNode(child, childPaths);

  for (const childPath of childPaths) {
    if (results.length >= PATH_EXPLOSION_LIMIT) return;

    // Not inverts the outcome
    const inverted: "allow" | "deny" = childPath.finalOutcome === "allow" ? "deny" : "allow";

    results.push({
      nodeIds: [node.nodeId, ...childPath.nodeIds],
      nodeOutcomes: [inverted, ...childPath.nodeOutcomes],
      finalOutcome: inverted,
    });
  }
}

function enumerateLabeled(node: PolicyNodeDescriptor, results: PathEntry[]): void {
  const child = node.children[0];
  if (!child) {
    results.push({
      nodeIds: [node.nodeId],
      nodeOutcomes: ["deny"],
      finalOutcome: "deny",
    });
    return;
  }

  const childPaths: PathEntry[] = [];
  enumerateNode(child, childPaths);

  for (const childPath of childPaths) {
    if (results.length >= PATH_EXPLOSION_LIMIT) return;

    results.push({
      nodeIds: [node.nodeId, ...childPath.nodeIds],
      nodeOutcomes: [childPath.finalOutcome, ...childPath.nodeOutcomes],
      finalOutcome: childPath.finalOutcome,
    });
  }
}

function buildPathDescriptor(
  entry: PathEntry,
  descriptorId: string,
  index: number
): GuardPathDescriptor {
  return {
    pathId: `path-${index}`,
    descriptorId,
    nodeIds: entry.nodeIds,
    nodeOutcomes: entry.nodeOutcomes,
    finalOutcome: entry.finalOutcome,
    description: describeGuardPath(entry.nodeOutcomes, entry.finalOutcome),
    frequency: undefined,
    observedCount: 0,
  };
}

// ── Path Description ─────────────────────────────────────────────────────────

/** Generate a human-readable description for a guard path. */
export function describeGuardPath(
  outcomes: readonly ("allow" | "deny" | "skip")[],
  finalOutcome: "allow" | "deny"
): string {
  const skipCount = outcomes.filter(o => o === "skip").length;
  const denyCount = outcomes.filter(o => o === "deny").length;
  const evaluatedCount = outcomes.filter(o => o !== "skip").length;

  if (skipCount === 0) {
    return finalOutcome === "allow"
      ? `All ${evaluatedCount} nodes evaluated, allowed`
      : `All ${evaluatedCount} nodes evaluated, denied`;
  }

  if (finalOutcome === "deny") {
    return `Short-circuited after ${evaluatedCount} nodes (${skipCount} skipped), denied (${denyCount} deny)`;
  }
  return `Short-circuited after ${evaluatedCount} nodes (${skipCount} skipped), allowed`;
}

// ── Frequency & Coverage ─────────────────────────────────────────────────────

/**
 * Compute path frequencies from observed execution traces.
 *
 * Takes an array of observation counts (one per path) and returns
 * frequencies (0.0 to 1.0).
 */
export function computeFrequencies(observedCounts: readonly number[]): readonly number[] {
  const total = observedCounts.reduce((sum, c) => sum + c, 0);
  if (total === 0) {
    return observedCounts.map(() => 0);
  }
  return observedCounts.map(c => c / total);
}

/**
 * Compute path coverage: fraction of paths that have been observed.
 */
export function computeCoverage(input: {
  readonly totalPaths: number;
  readonly observedPaths: number;
}): number {
  if (input.totalPaths === 0) {
    return 0;
  }
  return input.observedPaths / input.totalPaths;
}
