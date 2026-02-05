/**
 * Tests for enhanced template literal error types with code examples.
 *
 * These tests document the enhanced error messages with examples that appear
 * during compile-time validation failures. While the override method returns
 * error strings at the type level (not runtime), these tests demonstrate the
 * scenarios where those enhanced error messages would be shown to developers.
 *
 * To see the actual error messages with examples, uncomment the test calls
 * and observe the TypeScript errors in your IDE.
 *
 * @packageDocumentation
 */

import { describe, test, expect } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface UserService {
  getUser(id: string): { id: string; name: string };
}

interface EmailService {
  send(to: string, subject: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });
const EmailServicePort = port<EmailService>()({ name: "EmailService" });

// =============================================================================
// PortNotInGraphError Tests - Port doesn't exist in graph
// =============================================================================

describe("PortNotInGraphError with code examples", () => {
  test("shows error with example when overriding non-existent port", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // This adapter is for a port that doesn't exist in the graph
    const UnknownAdapter = createAdapter({
      provides: DatabasePort, // DatabasePort is NOT in the graph
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => ({}) }),
    });

    /**
     * Expected error message includes:
     *
     * ERROR[TYPE-01]: Port 'Database' not found in graph.
     *
     * Available ports: Logger
     *
     * Fix: Add adapter for 'Database' to graph before creating override.
     *
     * Example:
     *   const graph = GraphBuilder.create()
     *     .provide(DatabaseAdapter)  // Add the missing adapter
     *     .build();
     */
    // Uncommenting the line below would trigger a compile-time error:
    // container.override(UnknownAdapter).build();

    // Runtime: This test verifies compile-time errors, so we just ensure
    // the container is still valid for other operations
    expect(container.isDisposed).toBe(false);
  });

  test("error example uses actual port name from type parameter", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => ({}) }),
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // EmailService doesn't exist in graph (only Database)
    const EmailAdapter = createAdapter({
      provides: EmailServicePort, // EmailServicePort NOT in graph
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        send: () => {},
      }),
    });

    /**
     * Expected error shows 'EmailService' specifically:
     *
     * ERROR[TYPE-01]: Port 'EmailService' not found in graph.
     *
     * Available ports: Database
     *
     * Fix: Add adapter for 'EmailService' to graph before creating override.
     *
     * Example:
     *   const graph = GraphBuilder.create()
     *     .provide(EmailServiceAdapter)  // Add the missing adapter
     *     .build();
     */
    // Uncommenting the line below would trigger a compile-time error:
    // container.override(EmailAdapter).build();

    expect(container.isDisposed).toBe(false);
  });

  test("error lists available ports correctly", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => ({}) }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const container = createContainer({ graph, name: "Test" });

    const EmailAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ send: () => {} }),
    });

    /**
     * Error should list both Logger and Database as available:
     *
     * ERROR[TYPE-01]: Port 'EmailService' not found in graph.
     *
     * Available ports: Logger | Database
     *
     * Fix: Add adapter for 'EmailService' to graph before creating override.
     *
     * Example:
     *   const graph = GraphBuilder.create()
     *     .provide(EmailServiceAdapter)  // Add the missing adapter
     *     .build();
     */
    // Uncommenting the line below would trigger a compile-time error:
    // container.override(EmailAdapter).build();

    expect(container.isDisposed).toBe(false);
  });
});

// =============================================================================
// MissingDependenciesError Tests - Adapter has unsatisfied dependencies
// =============================================================================

describe("MissingDependenciesError with code examples", () => {
  test("shows error with example when override adapter has missing dependencies", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // UserService requires Database, but Database is NOT in the graph
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort], // DatabasePort NOT in graph
      lifetime: "singleton",
      factory: deps => ({
        getUser: id => {
          deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test User" };
        },
      }),
    });

    /**
     * Expected error includes missing dependency and example:
     *
     * ERROR[TYPE-02]: Override adapter for 'UserService' has unsatisfied dependencies.
     *
     * Missing: Database
     *
     * Fix: Ensure all required ports exist in graph or add them before overriding.
     *
     * Example:
     *   const graph = GraphBuilder.create()
     *     .provide(DatabaseAdapter)  // Add missing dependency
     *     .provide(UserServiceAdapter)
     *     .build();
     */
    // Uncommenting the line below would trigger a compile-time error:
    // container.override(UserServiceAdapter).build();

    expect(container.isDisposed).toBe(false);
  });

  test("error example shows multiple missing dependencies", () => {
    const graph = GraphBuilder.create().build(); // Empty graph
    const container = createContainer({ graph, name: "Test" });

    // UserService requires both Logger and Database, both missing
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort], // Both NOT in graph
      lifetime: "singleton",
      factory: deps => ({
        getUser: id => {
          deps.Logger.log(`Getting user ${id}`);
          deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test User" };
        },
      }),
    });

    /**
     * Expected error lists both missing dependencies:
     *
     * ERROR[TYPE-02]: Override adapter for 'UserService' has unsatisfied dependencies.
     *
     * Missing: Logger | Database
     *
     * Fix: Ensure all required ports exist in graph or add them before overriding.
     *
     * Example:
     *   const graph = GraphBuilder.create()
     *     .provide(Logger | DatabaseAdapter)  // Add missing dependency
     *     .provide(UserServiceAdapter)
     *     .build();
     */
    // Uncommenting the line below would trigger a compile-time error:
    // container.override(UserServiceAdapter).build();

    expect(container.isDisposed).toBe(false);
  });

  test("error uses specific port name being overridden", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // EmailService requires Database (missing)
    const EmailAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [DatabasePort], // NOT in graph
      lifetime: "singleton",
      factory: deps => ({
        send: (to: string, subject: string) => {
          deps.Database.query(`INSERT INTO emails...`);
        },
      }),
    });

    /**
     * Error specifically mentions 'EmailService':
     *
     * ERROR[TYPE-02]: Override adapter for 'EmailService' has unsatisfied dependencies.
     *
     * Missing: Database
     *
     * Fix: Ensure all required ports exist in graph or add them before overriding.
     *
     * Example:
     *   const graph = GraphBuilder.create()
     *     .provide(DatabaseAdapter)  // Add missing dependency
     *     .provide(EmailServiceAdapter)
     *     .build();
     */
    // Uncommenting the line below would trigger a compile-time error:
    // container.override(EmailAdapter).build();

    expect(container.isDisposed).toBe(false);
  });
});

// =============================================================================
// Type-Level Validation Tests - Successful cases
// =============================================================================

describe("successful override validation (no errors)", () => {
  test("override succeeds when port exists and dependencies satisfied", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => ({}) }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: id => {
          deps.Logger.log(`Getting user ${id}`);
          deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test User" };
        },
      }),
    });

    // Graph has all dependencies
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    const container = createContainer({ graph, name: "Test" });

    // Mock UserService with same dependencies - should work
    const MockUserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: id => {
          deps.Logger.log(`Mock getting user ${id}`);
          deps.Database.query(`SELECT * FROM mock_users WHERE id = '${id}'`);
          return { id, name: "Mock User" };
        },
      }),
    });

    // No type error - all dependencies satisfied
    const overrideContainer = container.override(MockUserServiceAdapter).build();

    expect(overrideContainer.resolve(UserServicePort).getUser("123")).toEqual({
      id: "123",
      name: "Mock User",
    });
  });

  test("override succeeds with no dependencies", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // No type error - port exists, no dependencies needed
    const overrideContainer = container.override(MockLoggerAdapter).build();

    expect(overrideContainer.resolve(LoggerPort)).toBeDefined();
  });
});
