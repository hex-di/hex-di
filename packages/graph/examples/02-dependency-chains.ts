/**
 * Example 2: Dependency Chains
 *
 * This example demonstrates how to build complex dependency chains
 * and how GraphBuilder validates them at compile time.
 *
 * Key concepts:
 * - Multi-level dependency chains (A → B → C)
 * - Automatic cycle detection
 * - Order-independent registration
 */

import { port, createAdapter, type AdapterConstraint } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";

// Declare console for Node.js environment
declare const console: { log(message: string, ...args: unknown[]): void };

// =============================================================================
// Define a Layered Architecture
// =============================================================================

// Infrastructure Layer
interface Config {
  readonly databaseUrl: string;
  readonly apiKey: string;
}

// Data Layer
interface Database {
  query<T>(sql: string): Promise<T[]>;
}

// Repository Layer
interface UserRepository {
  findAll(): Promise<{ id: string; name: string }[]>;
}

// Service Layer
interface UserService {
  getAllUsers(): Promise<{ id: string; name: string }[]>;
}

// =============================================================================
// Create Ports
// =============================================================================

const ConfigPort = port<Config>()({ name: "Config" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserRepositoryPort = port<UserRepository>()({ name: "UserRepository" });
const UserServicePort = port<UserService>()({ name: "UserService" });

// =============================================================================
// Create Adapters with Dependencies
// =============================================================================

// Config has no dependencies (root of the chain)
const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  lifetime: "singleton",
  factory: () => ({
    databaseUrl: "postgres://localhost:5432/app",
    apiKey: "secret-key",
  }),
});

// Database depends on Config
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  lifetime: "singleton",
  requires: [ConfigPort],
  factory: deps => ({
    query: async <T>(sql: string): Promise<T[]> => {
      console.log(`Executing on ${deps.Config.databaseUrl}: ${sql}`);
      return [] as T[];
    },
  }),
});

// UserRepository depends on Database
const UserRepositoryAdapter = createAdapter({
  provides: UserRepositoryPort,
  lifetime: "singleton",
  requires: [DatabasePort],
  factory: deps => ({
    findAll: async () => {
      return deps.Database.query("SELECT * FROM users");
    },
  }),
});

// UserService depends on UserRepository
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  lifetime: "singleton",
  requires: [UserRepositoryPort],
  factory: deps => ({
    getAllUsers: async () => {
      return deps.UserRepository.findAll();
    },
  }),
});

// =============================================================================
// Build the Graph (Order Doesn't Matter!)
// =============================================================================

// GraphBuilder resolves the correct order automatically
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // Depends on UserRepository
  .provide(ConfigAdapter) // No dependencies
  .provide(UserRepositoryAdapter) // Depends on Database
  .provide(DatabaseAdapter) // Depends on Config
  .build();

// Dependency chain: Config → Database → UserRepository → UserService
console.log("Graph built with 4-level dependency chain!");

// =============================================================================
// Inspect the Dependency Graph
// =============================================================================

const inspection = graph.adapters.map((adapter: AdapterConstraint) => ({
  port: adapter.provides.__portName,
  requires: adapter.requires.map(req => req.__portName),
}));

console.log("Dependency structure:");
inspection.forEach(({ port, requires }: { port: string; requires: string[] }) => {
  console.log(`  ${port} → [${requires.join(", ") || "none"}]`);
});

// Output:
//   UserService → [UserRepository]
//   Config → [none]
//   UserRepository → [Database]
//   Database → [Config]
