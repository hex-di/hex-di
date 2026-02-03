/**
 * Example 1: Basic Graph Building
 *
 * This example demonstrates the fundamental pattern of building a dependency
 * graph with ports and adapters.
 *
 * Key concepts:
 * - Ports define contracts (interfaces)
 * - Adapters implement contracts with factories
 * - GraphBuilder accumulates adapters with compile-time validation
 * - build() creates an immutable graph
 */

import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";

// Declare console for Node.js environment
declare const console: { log(message: string, ...args: unknown[]): void };

// =============================================================================
// Step 1: Define Ports (Contracts)
// =============================================================================

// A port defines WHAT a service provides, not HOW
interface Logger {
  log(message: string): void;
}

interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

// Create typed port definitions
const LoggerPort = port<Logger>()({ name: "Logger" });
const UserRepositoryPort = port<UserRepository>()({ name: "UserRepository" });

// =============================================================================
// Step 2: Create Adapters (Implementations)
// =============================================================================

// An adapter provides a concrete implementation for a port
const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "singleton", // One instance for the entire application
  factory: () => ({
    log: (message: string) => console.log(`[LOG] ${message}`),
  }),
});

const InMemoryUserRepositoryAdapter = createAdapter({
  provides: UserRepositoryPort,
  lifetime: "singleton",
  requires: [LoggerPort], // Declares dependency on Logger
  factory: deps => {
    const users = new Map([
      ["1", { id: "1", name: "Alice" }],
      ["2", { id: "2", name: "Bob" }],
    ]);
    return {
      findById: async (id: string) => {
        deps.Logger.log(`Looking up user ${id}`);
        return users.get(id) ?? null;
      },
    };
  },
});

// =============================================================================
// Step 3: Build the Graph
// =============================================================================

// GraphBuilder validates dependencies at compile time
const graph = GraphBuilder.create()
  .provide(ConsoleLoggerAdapter)
  .provide(InMemoryUserRepositoryAdapter)
  .build();

// Type of graph: Graph<LoggerPort | UserRepositoryPort>
// - All dependencies are satisfied
// - No cycles detected
// - Lifetimes are compatible

console.log("Graph built successfully!");
console.log("Adapters:", graph.adapters.length); // 2

// =============================================================================
// What happens with missing dependencies?
// =============================================================================

// Uncommenting this would cause a compile-time error:
//
// const incompleteGraph = GraphBuilder.create()
//   .provide(InMemoryUserRepositoryAdapter) // Missing Logger!
//   .build();
//
// TypeScript Error: "Missing dependencies: Logger"
