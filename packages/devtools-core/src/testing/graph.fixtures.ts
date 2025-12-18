/**
 * Graph fixture factories for testing.
 *
 * @internal This module is for internal testing only and is not part of the public API.
 * @packageDocumentation
 */

import type {
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
} from "../types.js";

// =============================================================================
// Node Factory
// =============================================================================

/**
 * Options for creating a node with required id.
 *
 * @internal
 */
export type CreateNodeOptions = Partial<Omit<ExportedNode, "id">> & {
  readonly id: string;
};

/**
 * Create a node with sensible defaults.
 *
 * Only `id` is required; all other properties have defaults:
 * - `label`: defaults to `id`
 * - `lifetime`: defaults to `"singleton"`
 * - `factoryKind`: defaults to `"sync"`
 *
 * @internal This function is for internal testing only.
 *
 * @example Basic node
 * ```typescript
 * const node = createNode({ id: "Logger" });
 * // { id: "Logger", label: "Logger", lifetime: "singleton", factoryKind: "sync" }
 * ```
 *
 * @param options - Node options with required id
 * @returns An ExportedNode with all required fields
 */
export function createNode(options: CreateNodeOptions): ExportedNode {
  const { id, label, lifetime, factoryKind } = options;

  return {
    id,
    label: label ?? id,
    lifetime: lifetime ?? "singleton",
    factoryKind: factoryKind ?? "sync",
  };
}

// =============================================================================
// Edge Factory
// =============================================================================

/**
 * Create an edge representing a dependency relationship.
 *
 * @internal This function is for internal testing only.
 *
 * @example Basic edge
 * ```typescript
 * const edge = createEdge("UserService", "Logger");
 * // { from: "UserService", to: "Logger" }
 * ```
 *
 * @param from - The dependent node id
 * @param to - The dependency node id
 * @returns An ExportedEdge
 */
export function createEdge(from: string, to: string): ExportedEdge {
  return { from, to };
}

// =============================================================================
// Graph Factory
// =============================================================================

/**
 * Options for creating a graph.
 *
 * @internal
 */
export interface CreateGraphOptions {
  readonly nodes?: readonly ExportedNode[];
  readonly edges?: readonly ExportedEdge[];
}

/**
 * Create a graph with optional nodes and edges.
 *
 * @internal This function is for internal testing only.
 *
 * @example Empty graph
 * ```typescript
 * const graph = createGraph();
 * // { nodes: [], edges: [] }
 * ```
 *
 * @param options - Graph creation options
 * @returns An ExportedGraph
 */
export function createGraph(options: CreateGraphOptions = {}): ExportedGraph {
  const nodes = options.nodes ?? [];
  const edges = options.edges ?? [];

  return Object.freeze({
    nodes: Object.freeze([...nodes]),
    edges: Object.freeze([...edges]),
  });
}

// =============================================================================
// Common Test Graphs
// =============================================================================

/**
 * Creates a minimal graph with a single node and no edges.
 *
 * @internal
 */
export function createMinimalGraph(): ExportedGraph {
  return createGraph({
    nodes: [createNode({ id: "Logger" })],
    edges: [],
  });
}

/**
 * Creates a simple graph with two nodes and one edge.
 *
 * @internal
 */
export function createSimpleGraph(): ExportedGraph {
  return createGraph({
    nodes: [
      createNode({ id: "Logger" }),
      createNode({ id: "UserService", lifetime: "scoped" }),
    ],
    edges: [createEdge("UserService", "Logger")],
  });
}

/**
 * Creates a complex graph with multiple nodes and edges.
 *
 * @internal
 */
export function createComplexGraph(): ExportedGraph {
  return createGraph({
    nodes: [
      createNode({ id: "Config" }),
      createNode({ id: "Logger" }),
      createNode({ id: "Database" }),
      createNode({ id: "UserRepository", lifetime: "scoped" }),
      createNode({ id: "UserService", lifetime: "scoped" }),
      createNode({ id: "AuthService", lifetime: "singleton" }),
    ],
    edges: [
      createEdge("Logger", "Config"),
      createEdge("Database", "Config"),
      createEdge("Database", "Logger"),
      createEdge("UserRepository", "Database"),
      createEdge("UserService", "UserRepository"),
      createEdge("UserService", "Logger"),
      createEdge("AuthService", "UserService"),
    ],
  });
}

/**
 * Creates a graph demonstrating different lifetimes.
 *
 * @internal
 */
export function createLifetimeGraph(): ExportedGraph {
  return createGraph({
    nodes: [
      createNode({ id: "Singleton", lifetime: "singleton" }),
      createNode({ id: "Scoped", lifetime: "scoped" }),
      createNode({ id: "Transient", lifetime: "transient" }),
    ],
    edges: [
      createEdge("Scoped", "Singleton"),
      createEdge("Transient", "Scoped"),
    ],
  });
}

/**
 * Creates a graph with async factories.
 *
 * @internal
 */
export function createAsyncGraph(): ExportedGraph {
  return createGraph({
    nodes: [
      createNode({ id: "Config" }),
      createNode({ id: "Database", factoryKind: "async" }),
      createNode({ id: "UserRepository", factoryKind: "async" }),
    ],
    edges: [
      createEdge("Database", "Config"),
      createEdge("UserRepository", "Database"),
    ],
  });
}
