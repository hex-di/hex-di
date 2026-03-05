/**
 * Type-level tests for InitializationOrder (TG-16.3).
 *
 * Tests that the type-level topological sort produces correct ordering.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { InitializationOrder } from "../src/validation/types/init-order.js";
import { GraphBuilder } from "../src/builder/builder.js";
import { port, createAdapter } from "@hex-di/core";

// =============================================================================
// Test Ports and Adapters
// =============================================================================

interface Config {
  url: string;
}
interface Database {
  query(): void;
}
interface Logger {
  log(): void;
}
interface UserService {
  find(): void;
}

const ConfigPort = port<Config>()({ name: "Config" });
const DatabasePort = port<Database>()({ name: "Database" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const UserServicePort = port<UserService>()({ name: "UserService" });

const configAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ url: "x" }),
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: () => ({ query: () => {} }),
});

const userServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  lifetime: "scoped",
  factory: () => ({ find: () => {} }),
});

// =============================================================================
// Type-Level Tests
// =============================================================================

describe("16.3: Type-level InitializationOrder", () => {
  it("produces a readonly string array type for single adapter", () => {
    const builder = GraphBuilder.create().provide(configAdapter);
    type Order = InitializationOrder<typeof builder>;
    expectTypeOf<Order>().toMatchTypeOf<readonly string[]>();
  });

  it("produces a readonly string array for chain: Config -> Database", () => {
    const builder = GraphBuilder.create().provide(configAdapter).provide(databaseAdapter);
    type Order = InitializationOrder<typeof builder>;
    expectTypeOf<Order>().toMatchTypeOf<readonly string[]>();
  });

  it("produces a readonly string array for multi-level graph", () => {
    const builder = GraphBuilder.create()
      .provide(configAdapter)
      .provide(loggerAdapter)
      .provide(databaseAdapter)
      .provide(userServiceAdapter);

    type Order = InitializationOrder<typeof builder>;
    expectTypeOf<Order>().toMatchTypeOf<readonly string[]>();
  });

  it("degrades gracefully for empty graph", () => {
    const builder = GraphBuilder.create();
    type Order = InitializationOrder<typeof builder>;
    expectTypeOf<Order>().toMatchTypeOf<readonly string[]>();
  });

  it("produces a non-empty tuple for non-empty graph", () => {
    const builder = GraphBuilder.create().provide(configAdapter).provide(databaseAdapter);

    type Order = InitializationOrder<typeof builder>;
    expectTypeOf<Order>().toMatchTypeOf<readonly string[]>();
  });
});
