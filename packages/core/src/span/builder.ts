/**
 * Span builder for constructing resolution trees.
 *
 * @packageDocumentation
 */

import type { TraceEntry } from "../inspection/tracing-types.js";
import type { ResolutionSpan } from "./types.js";

/**
 * Builds a tree of ResolutionSpans from flat TraceEntry records.
 *
 * Reconstructs the parent-child relationships to create a hierarchical
 * view of dependency resolutions.
 *
 * @example
 * ```typescript
 * const builder = new SpanBuilder();
 *
 * // Add trace entries (order doesn't matter)
 * for (const entry of collector.getTraces()) {
 *   builder.addEntry(entry);
 * }
 *
 * // Get root spans (top-level resolutions)
 * const roots = builder.getRootSpans();
 *
 * // Each root span contains nested children
 * for (const span of roots) {
 *   console.log(`${span.portName}: ${span.duration}ms`);
 *   for (const child of span.children) {
 *     console.log(`  └─ ${child.portName}: ${child.duration}ms`);
 *   }
 * }
 * ```
 */
export class SpanBuilder {
  /** Map of trace ID to TraceEntry */
  private readonly entries: Map<string, TraceEntry> = new Map();
  /** Set of trace IDs that are children of other traces */
  private readonly childIds: Set<string> = new Set();

  /**
   * Adds a trace entry to the builder.
   *
   * @param entry - The trace entry to add
   */
  addEntry(entry: TraceEntry): void {
    this.entries.set(entry.id, entry);
    for (const childId of entry.childIds) {
      this.childIds.add(childId);
    }
  }

  /**
   * Adds multiple trace entries to the builder.
   *
   * @param entries - The trace entries to add
   */
  addEntries(entries: readonly TraceEntry[]): void {
    for (const entry of entries) {
      this.addEntry(entry);
    }
  }

  /**
   * Returns all root spans (traces without parents).
   *
   * Root spans are top-level resolutions initiated by user code,
   * not dependency resolutions triggered by other resolutions.
   *
   * @returns Array of root ResolutionSpans with nested children
   */
  getRootSpans(): readonly ResolutionSpan[] {
    const roots: ResolutionSpan[] = [];

    for (const entry of this.entries.values()) {
      if (!this.childIds.has(entry.id)) {
        roots.push(this.buildSpan(entry));
      }
    }

    // Sort by order (chronological)
    return roots.sort((a, b) => this.getOrder(a.id) - this.getOrder(b.id));
  }

  /**
   * Returns a specific span by ID, including its children.
   *
   * @param id - The trace ID to look up
   * @returns The ResolutionSpan or undefined if not found
   */
  getSpan(id: string): ResolutionSpan | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    return this.buildSpan(entry);
  }

  /**
   * Clears all entries from the builder.
   */
  clear(): void {
    this.entries.clear();
    this.childIds.clear();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private buildSpan(entry: TraceEntry): ResolutionSpan {
    const children: ResolutionSpan[] = [];

    for (const childId of entry.childIds) {
      const childEntry = this.entries.get(childId);
      if (childEntry) {
        children.push(this.buildSpan(childEntry));
      }
    }

    return {
      id: entry.id,
      portName: entry.portName,
      duration: entry.duration,
      isCacheHit: entry.isCacheHit,
      lifetime: entry.lifetime,
      scopeId: entry.scopeId,
      startTime: entry.startTime,
      children: Object.freeze(children),
    };
  }

  private getOrder(id: string): number {
    return this.entries.get(id)?.order ?? 0;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Converts a TraceEntry to a ResolutionSpan (without children).
 *
 * Use this for simple conversions where child relationships aren't needed.
 * For full tree structure, use SpanBuilder.
 *
 * @param entry - The trace entry to convert
 * @returns A ResolutionSpan without children
 */
export function toSpan(entry: TraceEntry): ResolutionSpan {
  return {
    id: entry.id,
    portName: entry.portName,
    duration: entry.duration,
    isCacheHit: entry.isCacheHit,
    lifetime: entry.lifetime,
    scopeId: entry.scopeId,
    startTime: entry.startTime,
    children: Object.freeze([]),
  };
}

/**
 * Calculates the total self time of a span (excluding children).
 *
 * Self time = span duration - sum of direct children durations
 *
 * @param span - The span to analyze
 * @returns Self time in milliseconds
 */
export function getSelfTime(span: ResolutionSpan): number {
  const childrenTime = span.children.reduce((sum, child) => sum + child.duration, 0);
  return Math.max(0, span.duration - childrenTime);
}

/**
 * Gets the depth of a span tree.
 *
 * @param span - The root span
 * @returns The maximum depth (1 for leaf spans)
 */
export function getSpanDepth(span: ResolutionSpan): number {
  if (span.children.length === 0) {
    return 1;
  }
  return 1 + Math.max(...span.children.map(getSpanDepth));
}

/**
 * Counts total spans in a tree.
 *
 * @param span - The root span
 * @returns Total number of spans including the root
 */
export function countSpans(span: ResolutionSpan): number {
  return 1 + span.children.reduce((sum, child) => sum + countSpans(child), 0);
}
