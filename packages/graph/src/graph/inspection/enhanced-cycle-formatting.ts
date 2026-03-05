/**
 * Enhanced cycle error formatting.
 *
 * Combines cycle diagram generation, suggestion engine, well-foundedness
 * verification, and structured error types to produce rich, actionable
 * cycle errors for the build pipeline.
 *
 * Well-founded cycles (where all back-edges go through lazy ports) are
 * excluded from error reporting. Only ill-founded cycles produce errors.
 *
 * @see spec/packages/graph/behaviors/06-enhanced-cycle-errors.md
 * @see spec/packages/graph/behaviors/08-well-founded-cycles.md
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";
import { generateCycleDiagram } from "../../errors/cycle-diagram.js";
import { generateCycleSuggestions } from "../../errors/cycle-suggestions.js";
import { createCycleError, createMultipleCyclesError } from "../../errors/cycle-error.js";
import type { CycleError, MultipleCyclesError } from "../../errors/cycle-error.js";
import { detectAllCyclesAtRuntime } from "./runtime-cycle-detection.js";
import { normalizeCyclePath } from "./runtime-cycle-detection.js";
import { extractLazyEdges, verifyWellFoundedness } from "./well-founded-cycle.js";

/**
 * Formats a single cycle path into a `CycleError` with diagram and suggestions.
 *
 * When lazy edge information is provided, the diagram includes `(lazy)` annotations
 * on lazy edges, and the `isWellFounded` field is set based on the verification result.
 *
 * @param cyclePath - Array of port names forming the cycle (last element equals first)
 * @param adapters - The adapters in the graph for suggestion metadata lookup
 * @param lazyEdgeKeys - Optional set of lazy edge keys for well-founded annotation
 * @returns A frozen `CycleError`
 */
export function formatEnhancedCycleError(
  cyclePath: ReadonlyArray<string>,
  adapters: readonly AdapterConstraint[],
  lazyEdgeKeys?: ReadonlySet<string>
): CycleError {
  const normalized = normalizeCyclePath([...cyclePath]);
  const diagram = generateCycleDiagram(normalized, lazyEdgeKeys);

  // Determine well-foundedness if lazy edges are provided
  const wellFoundednessCheck = lazyEdgeKeys
    ? verifyWellFoundedness(normalized, lazyEdgeKeys)
    : undefined;

  const isWellFounded = wellFoundednessCheck?._tag === "WellFounded";

  // Well-founded cycles do not need refactoring suggestions
  const suggestions = isWellFounded
    ? Object.freeze([])
    : generateCycleSuggestions(normalized, { adapters });

  const lazyEdges = wellFoundednessCheck?.lazyEdges ?? [];

  const pathString = normalized.join(" -> ");
  const statusLabel = isWellFounded ? " (well-founded, accepted)" : "";
  const message = `ERROR[HEX002]: Circular dependency detected${statusLabel}\n\n${diagram}\n\nCycle: ${pathString}`;

  return createCycleError({
    cycle: normalized,
    diagram,
    suggestions,
    message,
    isWellFounded,
    lazyEdges,
  });
}

/**
 * Detects all cycles in the graph and formats ill-founded ones into error types.
 *
 * Well-founded cycles (where lazy edges break the cycle) are silently accepted
 * and excluded from the error result. Returns `null` if no ill-founded cycles
 * are found (including when all cycles are well-founded).
 *
 * Returns a `CycleError` for a single ill-founded cycle, or a `MultipleCyclesError`
 * when 2+ independent ill-founded cycles exist.
 *
 * @param adapters - The adapters in the graph
 * @returns A cycle error, multiple cycles error, or null if no ill-founded cycles
 */
export function formatEnhancedCycleErrors(
  adapters: readonly AdapterConstraint[]
): CycleError | MultipleCyclesError | null {
  const allCycles = detectAllCyclesAtRuntime(adapters);

  if (allCycles.length === 0) {
    return null;
  }

  const { edgeKeys } = extractLazyEdges(adapters);

  // Format all cycles with well-foundedness information
  const allCycleErrors = allCycles.map(cycle =>
    formatEnhancedCycleError(cycle, adapters, edgeKeys)
  );

  // Filter out well-founded cycles — they are accepted, not errors
  const illFoundedErrors = allCycleErrors.filter(e => !e.isWellFounded);

  if (illFoundedErrors.length === 0) {
    // All cycles are well-founded — no errors
    return null;
  }

  if (illFoundedErrors.length === 1) {
    return illFoundedErrors[0];
  }

  const summary = `Found ${illFoundedErrors.length} circular dependencies`;
  const diagrams = illFoundedErrors.map((e, i) => `Cycle ${i + 1}:\n${e.diagram}`).join("\n\n");

  return createMultipleCyclesError({
    cycles: illFoundedErrors,
    summary,
    message: `ERROR[HEX002]: ${summary}\n\n${diagrams}`,
  });
}
