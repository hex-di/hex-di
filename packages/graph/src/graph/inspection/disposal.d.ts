/**
 * Disposal Warning Utilities.
 *
 * This module provides functions for detecting potential disposal issues
 * in service dependencies.
 *
 * @packageDocumentation
 */
import type { AdapterConstraint } from "../../adapter/index.js";
/**
 * Computes disposal warnings for adapters with finalizers.
 *
 * Checks if any adapter with a finalizer depends on an adapter without a finalizer.
 * This can cause use-after-dispose issues when services are disposed in reverse
 * dependency order.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param adapters - All adapters in the graph
 * @param dependencyMap - Map of port name to its dependencies
 * @returns Array of warning messages
 *
 * @internal
 */
export declare function computeDisposalWarnings(adapters: readonly AdapterConstraint[], dependencyMap: Record<string, readonly string[]>): string[];
/**
 * Gets the list of ports that have finalizers.
 *
 * @pure Same inputs always produce the same output.
 *
 * @param adapters - All adapters in the graph
 * @returns Array of port names that have finalizers
 *
 * @internal
 */
export declare function getPortsWithFinalizers(adapters: readonly AdapterConstraint[]): string[];
