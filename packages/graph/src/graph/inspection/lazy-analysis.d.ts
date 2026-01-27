/**
 * Lazy Port Analysis Utilities.
 *
 * This module provides functions for detecting unnecessary lazy ports
 * in the dependency graph.
 *
 * @packageDocumentation
 */
import type { AdapterConstraint } from "../../adapter/index.js";
/**
 * Detects lazy ports that may be unnecessary (no cycle would exist without them).
 *
 * A lazy port is unnecessary if removing it wouldn't create a cycle in the graph.
 * This function identifies lazy dependencies and checks whether they actually
 * break a cycle or are just adding unnecessary indirection.
 *
 * @pure Same inputs always produce the same output.
 *
 * @param adapters - All adapters in the graph
 * @param dependencyMap - Map of port name to its dependencies
 * @returns Array of lazy port names that may be unnecessary
 *
 * @internal
 */
export declare function detectUnnecessaryLazyPorts(adapters: readonly AdapterConstraint[], dependencyMap: Record<string, readonly string[]>): string[];
