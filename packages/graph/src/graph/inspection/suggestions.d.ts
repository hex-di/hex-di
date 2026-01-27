/**
 * Graph Suggestion Generation.
 *
 * This module provides utilities for generating actionable suggestions
 * based on the current graph state.
 *
 * @packageDocumentation
 */
import type { GraphSuggestion } from "../types/inspection.js";
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
export declare function generateSuggestions(unsatisfiedRequirements: readonly string[], orphanPorts: readonly string[], maxChainDepth: number, dependencyMap: Record<string, readonly string[]>, disposalWarnings: readonly string[], unnecessaryLazyPorts: readonly string[]): GraphSuggestion[];
