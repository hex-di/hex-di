/**
 * Combined application graph for testing.
 *
 * This file provides a complete graph with all adapters from both root-graph
 * and chat-graph, primarily for testing purposes. It allows tests to create
 * a single container with all services without needing the child container pattern.
 *
 * In production, the recommended approach is:
 * - Root container with rootGraph (Logger, Config)
 * - Child container with chatGraphFragment (Chat services)
 *
 * @packageDocumentation
 */

import { GraphBuilder, type Graph } from "@hex-di/graph";
import {
  // Root adapters
  ConfigAdapter,
  LoggerAdapter,
  // Chat adapters
  MessageStoreAdapter,
  UserSessionAdapter,
  ChatServiceAdapter,
  NotificationServiceAdapter,
} from "./adapters.js";

// =============================================================================
// Combined App Graph (for testing)
// =============================================================================

/**
 * Combined dependency graph with all adapters.
 *
 * This graph includes all services from both root-graph and chat-graph,
 * allowing tests to create a single container without child container setup.
 *
 * Contains:
 * - LoggerAdapter (singleton, sync)
 * - ConfigAdapter (singleton, async)
 * - MessageStoreAdapter (singleton)
 * - UserSessionAdapter (scoped)
 * - ChatServiceAdapter (scoped)
 * - NotificationServiceAdapter (transient)
 *
 * @example Using in tests
 * ```typescript
 * import { appGraph } from "../src/di/app-graph.js";
 * import { createContainer } from "@hex-di/runtime";
 *
 * const container = createContainer(appGraph);
 * await container.initialize();
 * ```
 */
export const appGraph = GraphBuilder.create()
  // Root infrastructure
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  // Chat services
  .provide(MessageStoreAdapter)
  .provide(UserSessionAdapter)
  .provide(ChatServiceAdapter)
  .provide(NotificationServiceAdapter)
  .build();

/**
 * Type representing all sync ports provided by the app graph.
 */
export type AppPorts = typeof appGraph extends Graph<infer P, infer _A> ? P : never;

/**
 * Type representing all async ports in the app graph.
 */
export type AppAsyncPorts = typeof appGraph extends Graph<infer _P, infer A> ? A : never;
