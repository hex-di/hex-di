/**
 * Capability Audit — Graph-Level Authority Analysis.
 *
 * Produces a structured audit report for all adapters in a dependency graph,
 * summarizing ambient authority detections per adapter and providing an overall
 * authority hygiene score. Designed for CI/CD integration.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/11-capability-analyzer | BEH-CO-11-002}
 *
 * @packageDocumentation
 */

import type { InspectableGraph } from "../inspection/graph-types.js";
import type { AdapterAuditEntry, CapabilityAuditReport } from "./types.js";
import { detectAmbientAuthority } from "./analyzer.js";

// =============================================================================
// Public API
// =============================================================================

/**
 * Audits all adapters in a dependency graph for ambient authority usage.
 *
 * Iterates over every adapter registered in the graph, runs
 * {@link detectAmbientAuthority} on each factory, and aggregates the results
 * into a frozen {@link CapabilityAuditReport}.
 *
 * @param graph - A graph-like object with an `adapters` array
 * @returns A frozen capability audit report
 *
 * @example
 * ```typescript
 * const report = auditGraph(graph);
 *
 * if (report.highConfidenceViolations > 0) {
 *   console.error(report.summary);
 *   process.exitCode = 1;
 * }
 * ```
 */
export function auditGraph(graph: InspectableGraph): CapabilityAuditReport {
  const entries: AdapterAuditEntry[] = [];
  let cleanCount = 0;
  let violatingCount = 0;
  let highConfidenceCount = 0;

  for (const adapter of graph.adapters) {
    const portName = adapter.provides.__portName;
    const detections = detectAmbientAuthority(adapter.factory);
    const isClean = detections.length === 0;

    if (isClean) {
      cleanCount++;
    } else {
      violatingCount++;
      for (const detection of detections) {
        if (detection.confidence === "high") {
          highConfidenceCount++;
        }
      }
    }

    entries.push(
      Object.freeze({
        adapterName: portName,
        portName,
        detections,
        isClean,
      })
    );
  }

  const totalAdapters = graph.adapters.length;
  const summary = buildSummary(totalAdapters, cleanCount, violatingCount, highConfidenceCount);

  return Object.freeze({
    entries: Object.freeze(entries),
    totalAdapters,
    cleanAdapters: cleanCount,
    violatingAdapters: violatingCount,
    highConfidenceViolations: highConfidenceCount,
    summary,
  });
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Builds a human-readable summary string for the audit report.
 *
 * @internal
 */
function buildSummary(
  total: number,
  clean: number,
  violating: number,
  highConfidence: number
): string {
  if (total === 0) {
    return "No adapters to audit";
  }

  if (violating === 0) {
    return `All ${total} adapters pass capability audit`;
  }

  return `${clean}/${total} adapters clean. ${violating} violation${violating === 1 ? "" : "s"} (${highConfidence} high confidence)`;
}
