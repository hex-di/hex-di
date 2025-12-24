/**
 * Dependency graph composition for the React Showcase Chat Dashboard.
 *
 * This file builds the complete dependency graph by registering all adapters
 * with the GraphBuilder. The graph is validated at compile-time to ensure
 * all dependencies are satisfied.
 *
 * Demonstrates async factory support:
 * - ConfigAdapter is the only async adapter (uses provideAsync) - simulates API config loading
 * - Async adapters are always singletons and pre-initialized with container.initialize()
 * - All other adapters are sync and resolve immediately
 *
 * @packageDocumentation
 */

import { GraphBuilder, type Graph } from "@hex-di/graph";
import {
  ConfigAdapter,
  LoggerAdapter,
  MessageStoreAdapter,
  UserSessionAdapter,
  ChatServiceAdapter,
  NotificationServiceAdapter,
} from "./adapters.js";

// =============================================================================
// Graph Construction
// =============================================================================

/**
 * The complete dependency graph for the React Showcase application.
 *
 * This graph contains all 6 adapters registered in dependency order:
 * 1. LoggerAdapter (singleton, sync, no dependencies)
 * 2. ConfigAdapter (singleton, ASYNC - the only async adapter)
 * 3. MessageStoreAdapter (singleton, sync, depends on LoggerPort)
 * 4. UserSessionAdapter (scoped, sync, no dependencies)
 * 5. ChatServiceAdapter (scoped, sync, depends on Logger, UserSession, MessageStore)
 * 6. NotificationServiceAdapter (request, sync, depends on Logger, Config)
 *
 * Note: ConfigAdapter is the only async adapter. It's pre-initialized with
 * `container.initialize()`. All other adapters resolve synchronously.
 * NotificationServiceAdapter depends on ConfigPort but can be sync because
 * Config is pre-initialized as a singleton before any resolutions occur.
 *
 * The graph is validated at compile-time. If any required dependencies
 * are missing, TypeScript will produce a compile error with a message
 * like "Missing dependencies: PortName".
 *
 * @example Using the graph
 * ```typescript
 * import { createContainer } from "@hex-di/runtime";
 * import { appGraph } from "./di/graph";
 *
 * const container = createContainer(appGraph);
 * await container.initialize(); // Required for async adapters
 * const logger = container.resolve(LoggerPort);
 * ```
 */
export const appGraph = GraphBuilder.create()
  // Singleton adapters

  .provideAsync(ConfigAdapter) // Async singleton - simulates API config loading
  .provide(MessageStoreAdapter) // Sync singleton - localStorage persistence
  // Scoped adapters
  .provide(UserSessionAdapter)
  .provide(ChatServiceAdapter) // Sync scoped - depends on sync ports only
  // Request-scoped adapter
  .provide(NotificationServiceAdapter) // Sync request - Config is pre-initialized
  .build();

/**
 * Type representing all ports provided by the application graph.
 */
export type AppPorts = typeof appGraph extends Graph<infer P, infer _A> ? P : never;

/**
 * Type representing async ports in the application graph.
 */
export type AppAsyncPorts = typeof appGraph extends Graph<infer _P, infer A> ? A : never;

/**
 * Type assertion to verify the graph is complete.
 *
 * If this line causes a compile error, it means some adapters have
 * unsatisfied dependencies. The error message will indicate which
 * ports are missing.
 *
 * @internal
 */
type _GraphIsComplete = typeof appGraph extends { __valid: false }
  ? "Graph has missing dependencies"
  : true;

/**
 * Compile-time verification that the graph is valid.
 * This will cause a compile error if the graph is incomplete.
 */
const _verifyGraphComplete: _GraphIsComplete = true;

// Prevent unused variable warning
void _verifyGraphComplete;
