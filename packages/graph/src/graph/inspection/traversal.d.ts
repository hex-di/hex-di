/**
 * Graph Traversal Utilities.
 *
 * This module provides reusable functions for traversing and analyzing
 * dependency graphs at runtime. These utilities complement the compile-time
 * type-level validation with runtime inspection capabilities.
 *
 * @packageDocumentation
 */
import type { AdapterConstraint } from "../../adapter/index.js";
/**
 * Adjacency map representing the dependency graph structure.
 * Maps each port name to its direct dependencies.
 *
 * @example
 * ```typescript
 * const depMap: DependencyMap = {
 *   "UserService": ["UserRepository", "Logger"],
 *   "UserRepository": ["Database"],
 *   "Logger": [],
 *   "Database": []
 * };
 * ```
 */
export type DependencyMap = Record<string, readonly string[]>;
/**
 * Builds a dependency map from a collection of adapters.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * ## Iteration Order Independence
 *
 * The resulting map is semantically identical regardless of adapter order.
 * The array order of dependencies within each port reflects the adapter's
 * `requires` array order.
 *
 * @param adapters - The adapters to build the dependency map from
 * @returns A frozen dependency map (port name -> dependency port names)
 *
 * @example
 * ```typescript
 * const depMap = buildDependencyMap(graph.adapters);
 * console.log(depMap["UserService"]); // ["UserRepository", "Logger"]
 * ```
 */
export declare function buildDependencyMap(adapters: readonly AdapterConstraint[]): Readonly<DependencyMap>;
/**
 * Computes the topological order of ports in a dependency graph.
 *
 * Returns ports in an order where each port appears after all its dependencies.
 * This is the order in which services should be initialized.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * ## Iteration Order Independence
 *
 * When multiple valid topological orders exist, the function returns
 * a deterministic result based on the input order. For a consistent
 * canonical order, sort the input adapters first.
 *
 * @param adapters - The adapters to compute topological order for
 * @returns Array of port names in initialization order, or null if cycle detected
 *
 * @example
 * ```typescript
 * const order = topologicalSort(graph.adapters);
 * if (order) {
 *   console.log("Init order:", order);
 *   // ["Database", "Logger", "UserRepository", "UserService"]
 * } else {
 *   console.error("Cycle detected");
 * }
 * ```
 */
export declare function topologicalSort(adapters: readonly AdapterConstraint[]): string[] | null;
/**
 * Gets all transitive dependencies of a port.
 *
 * Returns all ports that the given port depends on, directly or indirectly.
 * Useful for understanding the full dependency tree of a service.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param portName - The port to get transitive dependencies for
 * @param depMap - The dependency map to traverse
 * @returns Set of all transitive dependencies (excludes the port itself)
 *
 * @example
 * ```typescript
 * const deps = getTransitiveDependencies("UserService", depMap);
 * // Set { "UserRepository", "Database", "Logger" }
 * ```
 */
export declare function getTransitiveDependencies(portName: string, depMap: Readonly<DependencyMap>): ReadonlySet<string>;
/**
 * Gets all transitive dependents of a port.
 *
 * Returns all ports that depend on the given port, directly or indirectly.
 * Useful for understanding the impact of changing a service.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param portName - The port to get transitive dependents for
 * @param depMap - The dependency map to traverse
 * @returns Set of all transitive dependents (excludes the port itself)
 *
 * @example
 * ```typescript
 * const dependents = getTransitiveDependents("Database", depMap);
 * // Set { "UserRepository", "UserService" }
 * ```
 */
export declare function getTransitiveDependents(portName: string, depMap: Readonly<DependencyMap>): ReadonlySet<string>;
/**
 * Finds a dependency path between two ports, if one exists.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param from - The starting port (dependent)
 * @param to - The target port (dependency)
 * @param depMap - The dependency map to traverse
 * @returns Array representing the path from -> to, or null if no path exists
 *
 * @example
 * ```typescript
 * const path = findDependencyPath("UserService", "Database", depMap);
 * // ["UserService", "UserRepository", "Database"]
 * ```
 */
export declare function findDependencyPath(from: string, to: string, depMap: Readonly<DependencyMap>): string[] | null;
/**
 * Finds common dependencies between two or more ports.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param portNames - The ports to find common dependencies for
 * @param depMap - The dependency map to traverse
 * @returns Set of ports that all given ports depend on (transitively)
 *
 * @example
 * ```typescript
 * const common = findCommonDependencies(["ServiceA", "ServiceB"], depMap);
 * // Set { "Logger", "Config" }
 * ```
 */
export declare function findCommonDependencies(portNames: readonly string[], depMap: Readonly<DependencyMap>): ReadonlySet<string>;
/**
 * Computes the dependency layers (initialization levels) for all ports.
 *
 * Ports with no dependencies are at level 0, ports that only depend on
 * level 0 ports are at level 1, and so on.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param adapters - The adapters to compute layers for
 * @returns Map of port name to its initialization level, or null if cycle detected
 *
 * @example
 * ```typescript
 * const layers = computeDependencyLayers(graph.adapters);
 * if (layers) {
 *   // { Database: 0, Logger: 0, UserRepository: 1, UserService: 2 }
 * }
 * ```
 */
export declare function computeDependencyLayers(adapters: readonly AdapterConstraint[]): ReadonlyMap<string, number> | null;
/**
 * Gets all ports grouped by their initialization layer.
 *
 * Returns an array where each element is an array of port names at that level.
 * Ports at the same level can be initialized in parallel.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param adapters - The adapters to group by layer
 * @returns Array of port groups by level, or null if cycle detected
 *
 * @example
 * ```typescript
 * const layers = getPortsByLayer(graph.adapters);
 * if (layers) {
 *   // [["Database", "Logger"], ["UserRepository"], ["UserService"]]
 *   // Level 0 ports can init in parallel, then level 1, etc.
 * }
 * ```
 */
export declare function getPortsByLayer(adapters: readonly AdapterConstraint[]): readonly (readonly string[])[] | null;
