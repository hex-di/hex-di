/**
 * Dependency graph composition for the React Showcase Chat Dashboard.
 *
 * This file builds the complete dependency graph by registering all adapters
 * with the GraphBuilder. The graph is validated at compile-time to ensure
 * all dependencies are satisfied.
 *
 * Demonstrates async factory support:
 * - ConfigAdapter is async (uses provideAsync) - simulates API config loading
 * - NotificationServiceAdapter is sync but depends on async ConfigPort
 * - This works because container.initialize() resolves all async adapters first
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
 * 2. ConfigAdapter (singleton, ASYNC - simulates API config loading)
 * 3. MessageStoreAdapter (singleton, ASYNC - simulates localStorage with async init)
 * 4. UserSessionAdapter (scoped, sync, no dependencies)
 * 5. ChatServiceAdapter (scoped, sync, requires Logger, UserSession, MessageStore)
 * 6. NotificationServiceAdapter (request, sync, requires Logger, Config)
 *
 * Note: NotificationServiceAdapter is a sync adapter that depends on ConfigPort (async).
 * This demonstrates HexDI's support for sync adapters depending on async ports.
 * The container must be initialized before use: `await container.initialize()`.
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
  .provide(LoggerAdapter)
  .provideAsync(ConfigAdapter) // Async adapter - simulates API config loading
  .provideAsync(MessageStoreAdapter) // Async adapter - simulates async storage access
  // Scoped adapters
  .provide(UserSessionAdapter)
  .provide(ChatServiceAdapter)
  // Request-scoped adapter (sync but depends on async ConfigPort)
  .provide(NotificationServiceAdapter)
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
