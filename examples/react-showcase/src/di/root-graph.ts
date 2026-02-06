/**
 * Root dependency graph for the React Showcase application.
 *
 * This graph provides shared infrastructure services that are used by all
 * feature modules (Chat Dashboard, TaskFlow). The root container is created
 * with this graph, and feature containers are children that extend it.
 *
 * Shared services:
 * - Logger: Application-wide logging
 * - Config: Application configuration (async - simulates API loading)
 *
 * @packageDocumentation
 */

import { GraphBuilder, type Graph } from "@hex-di/graph";
import { ConfigAdapter, LoggerAdapter } from "./adapters.js";

// =============================================================================
// Root Graph Construction
// =============================================================================

/**
 * The root dependency graph with shared infrastructure services.
 *
 * This graph is used to create the root container. Feature containers
 * (Chat, TaskFlow) are created as children of the root container,
 * inheriting these shared services.
 *
 * Contains:
 * 1. LoggerAdapter (singleton, sync) - Application-wide logging
 * 2. ConfigAdapter (singleton, ASYNC) - Application configuration
 *
 * @example Creating the root container with tracing
 * ```typescript
 * import { createContainer } from "@hex-di/runtime";
 * import { instrumentContainer, createMemoryTracer } from "@hex-di/tracing";
 * import { rootGraph } from "./di/root-graph";
 *
 * const container = createContainer({ graph: rootGraph, name: "App Root" });
 *
 * // Optional: add tracing
 * const tracer = createMemoryTracer();
 * const cleanup = instrumentContainer(container, tracer);
 *
 * await container.initialize(); // Required for async ConfigAdapter
 * ```
 */
export const rootGraph = GraphBuilder.create()
  .provide(LoggerAdapter) // Sync singleton - no dependencies
  .provide(ConfigAdapter) // Async singleton - simulates API config loading
  .build();

/**
 * Type representing ports provided by the root graph.
 */
export type RootPorts = typeof rootGraph extends Graph<infer P, infer _A> ? P : never;

/**
 * Type representing async ports in the root graph.
 */
export type RootAsyncPorts = typeof rootGraph extends Graph<infer _P, infer A> ? A : never;
