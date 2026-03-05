/**
 * ASCII cycle diagram generator for circular dependency errors.
 *
 * Generates Unicode box-drawing diagrams that visually represent cycle paths,
 * making circular dependency errors easier to understand at a glance.
 * Supports lazy edge annotations for well-founded cycle reporting.
 *
 * @see spec/packages/graph/behaviors/06-enhanced-cycle-errors.md — BEH-GR-06-001
 * @see spec/packages/graph/behaviors/08-well-founded-cycles.md — BEH-GR-08-003
 * @see spec/packages/graph/decisions/002-ascii-cycle-diagrams.md — ADR-GR-002
 * @packageDocumentation
 */

import { normalizeCyclePath } from "../graph/inspection/runtime-cycle-detection.js";

/**
 * Generates an ASCII diagram for a dependency cycle using Unicode box-drawing characters.
 *
 * The diagram visually represents the cycle path with connecting lines and arrows:
 *
 * ```
 * ┌─→ AuthService
 * │     ↓ requires
 * │   UserRepository
 * │     ↓ requires
 * │   EventBus
 * └─────┘ requires (cycle closes here)
 * ```
 *
 * When lazy edges are provided, the diagram annotates them:
 *
 * ```
 * ┌─→ AuthService
 * │     ↓ requires
 * │   UserRepository
 * │     ↓ requires (lazy)
 * │   EventBus
 * └─────┘ requires (cycle closes here)
 * ```
 *
 * The cycle is normalized to start from the lexicographically smallest node name
 * for deterministic output.
 *
 * @param cycle - Array of port names forming the cycle (last element equals first)
 * @param lazyEdgeKeys - Optional set of lazy edge keys in format `"from->to"`
 * @returns A pre-formatted ASCII diagram string
 */
export function generateCycleDiagram(
  cycle: ReadonlyArray<string>,
  lazyEdgeKeys?: ReadonlySet<string>
): string {
  const normalized = normalizeCyclePath([...cycle]);

  if (normalized.length < 2) {
    return "";
  }

  // For a self-loop [A, A]
  if (normalized.length === 2) {
    const name = normalized[0];
    const isClosingLazy = lazyEdgeKeys?.has(`${name}->${name}`) ?? false;
    const closingLabel = isClosingLazy
      ? "requires (lazy) (cycle closes here)"
      : "requires (cycle closes here)";
    return [
      `\u250C\u2500\u2192 ${name}`,
      `\u2514\u2500\u2500\u2500\u2500\u2500\u2518 ${closingLabel}`,
    ].join("\n");
  }

  // Extract unique nodes (everything except the repeated last element)
  const nodes = normalized.slice(0, -1);
  const lines: string[] = [];

  // First line: ┌─→ {first}
  lines.push(`\u250C\u2500\u2192 ${nodes[0]}`);

  // Intermediate nodes
  for (let i = 1; i < nodes.length; i++) {
    const from = nodes[i - 1];
    const to = nodes[i];
    const isLazy = lazyEdgeKeys?.has(`${from}->${to}`) ?? false;
    const label = isLazy ? "requires (lazy)" : "requires";
    lines.push(`\u2502     \u2193 ${label}`);
    lines.push(`\u2502   ${nodes[i]}`);
  }

  // Last line: └─────┘ requires (cycle closes here)
  const lastNode = nodes[nodes.length - 1];
  const firstNode = nodes[0];
  const isClosingLazy = lazyEdgeKeys?.has(`${lastNode}->${firstNode}`) ?? false;
  const closingLabel = isClosingLazy
    ? "requires (lazy) (cycle closes here)"
    : "requires (cycle closes here)";
  lines.push(`\u2514\u2500\u2500\u2500\u2500\u2500\u2518 ${closingLabel}`);

  return lines.join("\n");
}
