/**
 * Disposal plan computation via reverse topological sort.
 *
 * Uses Kahn's algorithm on the reverse dependency graph to produce
 * a phased disposal plan where leaf nodes (no dependents) are
 * disposed first and root nodes (no dependencies) are disposed last.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/14-formal-disposal-ordering | BEH-CO-14-001}
 *
 * @packageDocumentation
 */

import type { DependencyEntry, DisposalPlan, DisposalPhase, DisposalPhaseEntry } from "./types.js";

// =============================================================================
// Invariant Error
// =============================================================================

/**
 * Thrown when a cycle is detected during disposal planning.
 *
 * This should never happen if the graph was validated at build time.
 * If this error occurs, it indicates a framework bug.
 */
export class DisposalCycleInvariantError extends Error {
  readonly code = "DISPOSAL_CYCLE_INVARIANT" as const;
  readonly remainingNodes: ReadonlyArray<string>;

  constructor(remainingNodes: ReadonlyArray<string>) {
    super(
      `Invariant violation: cycle detected during disposal planning. ` +
        `Remaining nodes: [${remainingNodes.join(", ")}]. ` +
        `This indicates a framework bug — cycles should be rejected at graph build time.`
    );
    Object.setPrototypeOf(this, new.target.prototype);
    this.remainingNodes = Object.freeze([...remainingNodes]);
    Object.freeze(this);
  }

  override get name(): string {
    return "DisposalCycleInvariantError";
  }
}

// =============================================================================
// computeDisposalPlan
// =============================================================================

/**
 * Computes a phased disposal plan from a set of dependency entries.
 *
 * Algorithm (Kahn's algorithm on the "dependents" graph):
 * 1. Build an adjacency list: for each node, record its direct dependencies
 * 2. Build the reverse graph: for each node, record its dependents
 * 3. Start with nodes that have zero dependents (leaf nodes) as phase 0
 * 4. Remove them from the graph, decrement dependent counts on their dependencies
 * 5. When a dependency's dependent count reaches 0, add it to the next phase
 * 6. Repeat until all nodes are assigned to a phase
 *
 * @param entries - The dependency entries describing the graph
 * @returns A frozen `DisposalPlan` with phases ordered leaves-first
 * @throws {DisposalCycleInvariantError} If a cycle is detected (should never happen)
 */
export function computeDisposalPlan(entries: ReadonlyArray<DependencyEntry>): DisposalPlan {
  if (entries.length === 0) {
    return Object.freeze({
      phases: Object.freeze([]),
      totalAdapters: 0,
    });
  }

  // Build lookup maps
  const entryByName = new Map<string, DependencyEntry>();
  for (const entry of entries) {
    entryByName.set(entry.portName, entry);
  }

  // Build adjacency: portName -> set of ports it depends on (filtered to known nodes)
  const dependsOn = new Map<string, Set<string>>();
  // Reverse adjacency: portName -> set of ports that depend on it (dependents)
  const dependents = new Map<string, Set<string>>();
  // In-degree in the "dependents" graph = number of ports that depend on this node
  const dependentCount = new Map<string, number>();

  // Initialize all nodes
  for (const entry of entries) {
    dependsOn.set(entry.portName, new Set<string>());
    dependents.set(entry.portName, new Set<string>());
    dependentCount.set(entry.portName, 0);
  }

  // Fill edges
  for (const entry of entries) {
    const deps = dependsOn.get(entry.portName);
    if (deps === undefined) continue;

    for (const dep of entry.dependsOn) {
      // Only consider dependencies that are in the entry set
      if (entryByName.has(dep)) {
        deps.add(dep);
        // dep has a dependent: entry.portName
        const depDependents = dependents.get(dep);
        if (depDependents !== undefined) {
          depDependents.add(entry.portName);
        }
      }
    }
  }

  // Compute dependent counts
  for (const [node, depSet] of dependents) {
    dependentCount.set(node, depSet.size);
  }

  // Kahn's algorithm: start with nodes that have zero dependents (leaf nodes)
  const phases: DisposalPhase[] = [];
  let processed = 0;
  let currentLevel = 0;

  // Collect initial leaf nodes (no dependents)
  let queue: string[] = [];
  for (const [node, count] of dependentCount) {
    if (count === 0) {
      queue.push(node);
    }
  }
  // Sort for deterministic ordering within a phase
  queue.sort();

  while (queue.length > 0) {
    // Build phase entries for current level
    const phaseEntries: DisposalPhaseEntry[] = [];
    for (const node of queue) {
      const entry = entryByName.get(node);
      if (entry !== undefined) {
        phaseEntries.push(
          Object.freeze({
            adapterName: entry.portName,
            portName: entry.portName,
            hasFinalizer: entry.hasFinalizer,
          })
        );
      }
    }

    phases.push(
      Object.freeze({
        level: currentLevel,
        adapters: Object.freeze(phaseEntries),
      })
    );

    // Process this phase: remove nodes from graph, update counts
    const nextQueue: string[] = [];
    for (const node of queue) {
      processed++;
      const deps = dependsOn.get(node);
      if (deps === undefined) continue;

      for (const dep of deps) {
        // Remove this node as a dependent of dep
        const depDeps = dependents.get(dep);
        if (depDeps !== undefined) {
          depDeps.delete(node);
        }
        const currentCount = dependentCount.get(dep);
        if (currentCount !== undefined) {
          const newCount = currentCount - 1;
          dependentCount.set(dep, newCount);
          if (newCount === 0) {
            nextQueue.push(dep);
          }
        }
      }
    }

    // Sort for deterministic ordering
    nextQueue.sort();
    queue = nextQueue;
    currentLevel++;
  }

  // Safety check: if not all nodes were processed, there is a cycle
  if (processed !== entries.length) {
    const remaining: string[] = [];
    for (const [node] of dependentCount) {
      const count = dependentCount.get(node);
      if (count !== undefined && count > 0) {
        remaining.push(node);
      }
    }
    remaining.sort();
    throw new DisposalCycleInvariantError(remaining);
  }

  return Object.freeze({
    phases: Object.freeze(phases),
    totalAdapters: entries.length,
  });
}
