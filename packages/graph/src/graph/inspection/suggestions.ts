/**
 * Graph Suggestion Generation.
 *
 * This module provides utilities for generating actionable suggestions
 * based on the current graph state.
 *
 * @packageDocumentation
 */

import type { GraphSuggestion } from "../types/inspection.js";
import { INSPECTION_CONFIG } from "./complexity.js";

/**
 * Generates actionable suggestions based on the current graph state.
 *
 * @pure Same inputs always produce the same output.
 *
 * @param unsatisfiedRequirements - Array of port names that are required but not provided
 * @param orphanPorts - Array of port names that are provided but not required
 * @param maxChainDepth - Maximum dependency chain depth
 * @param dependencyMap - Map of port name to its dependencies
 * @param disposalWarnings - Array of disposal warning messages
 * @param unnecessaryLazyPorts - Array of lazy port names that may be unnecessary
 * @returns Array of actionable suggestions
 *
 * @internal
 */
export function generateSuggestions(
  unsatisfiedRequirements: readonly string[],
  orphanPorts: readonly string[],
  maxChainDepth: number,
  dependencyMap: Record<string, readonly string[]>,
  disposalWarnings: readonly string[],
  unnecessaryLazyPorts: readonly string[]
): GraphSuggestion[] {
  const suggestions: GraphSuggestion[] = [];

  // Suggestions for missing adapters
  for (const portName of unsatisfiedRequirements) {
    // Find which adapters require this port
    const dependents = Object.entries(dependencyMap)
      .filter(([, deps]) => deps.includes(portName))
      .map(([name]) => name);

    suggestions.push({
      type: "missing_adapter",
      portName,
      message: `Port '${portName}' is required by ${dependents.join(", ")} but has no adapter.`,
      action: `Add an adapter that provides '${portName}' using .provide(${portName}Adapter).`,
    });
  }

  // Suggestions for depth warning
  if (maxChainDepth >= INSPECTION_CONFIG.DEPTH_WARNING_THRESHOLD) {
    suggestions.push({
      type: "depth_warning",
      portName: "",
      message: `Dependency chain depth (${maxChainDepth}) approaches compile-time limit (${INSPECTION_CONFIG.DEFAULT_MAX_DEPTH}).`,
      action:
        "Use GraphBuilder.withMaxDepth<N>() for deeper graphs (up to 100), restructure to reduce depth, or use buildFragment() for deep subgraphs.",
    });
  }

  // Suggestions for orphan ports (only if graph is otherwise complete)
  if (unsatisfiedRequirements.length === 0 && orphanPorts.length > 0) {
    for (const portName of orphanPorts) {
      suggestions.push({
        type: "orphan_port",
        portName,
        message: `Port '${portName}' is provided but not required by any other adapter.`,
        action: `Verify '${portName}' is an intended entry point, or remove the adapter if unused.`,
      });
    }
  }

  // Suggestions for disposal warnings
  for (const warning of disposalWarnings) {
    // Extract port name from warning message
    const match = warning.match(/^'([^']+)'/);
    const portName = match ? match[1] : "";

    suggestions.push({
      type: "disposal_warning",
      portName,
      message: warning,
      action: `Add a finalizer to the dependency, or ensure disposal order doesn't matter for this service.`,
    });
  }

  // Suggestions for unnecessary lazy ports
  for (const lazyPortName of unnecessaryLazyPorts) {
    const originalPortName = lazyPortName.slice(4); // Remove "Lazy" prefix
    suggestions.push({
      type: "unnecessary_lazy",
      portName: lazyPortName,
      message: `Lazy port '${lazyPortName}' may be unnecessary - no cycle would exist with direct '${originalPortName}' dependency.`,
      action: `Consider replacing 'lazyPort(${originalPortName}Port)' with direct '${originalPortName}Port' in requires array.`,
    });
  }

  return suggestions;
}
