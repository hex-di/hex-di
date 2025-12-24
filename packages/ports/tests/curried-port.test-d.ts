/**
 * Type tests for the curried `port` function.
 *
 * This tests partial type inference:
 * - TService: explicitly provided
 * - TName: inferred from string argument
 */

import { describe, expectTypeOf, it } from "vitest";
import { port, type Port } from "../src/index.js";

// Test interfaces
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

describe("port() curried API", () => {
  it("infers TName from string argument", () => {
    const LoggerPort = port<Logger>()("Logger");

    // TName should be inferred as literal "Logger"
    expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();
  });

  it("preserves TService type in the port", () => {
    const LoggerPort = port<Logger>()("Logger");

    // Port should have correct types
    expectTypeOf(LoggerPort).toEqualTypeOf<Port<Logger, "Logger">>();
  });

  it("works with different services", () => {
    const LoggerPort = port<Logger>()("Logger");
    const DatabasePort = port<Database>()("Database");

    expectTypeOf(LoggerPort).toEqualTypeOf<Port<Logger, "Logger">>();
    expectTypeOf(DatabasePort).toEqualTypeOf<Port<Database, "Database">>();
  });

  it("different names create incompatible types", () => {
    const ConsoleLogger = port<Logger>()("ConsoleLogger");
    const FileLogger = port<Logger>()("FileLogger");

    // These should NOT be assignable to each other
    expectTypeOf(ConsoleLogger).not.toEqualTypeOf(FileLogger);
  });

  it("allows any string as port name", () => {
    const WeirdName = port<Logger>()("my-weird-port-name");
    expectTypeOf(WeirdName.__portName).toEqualTypeOf<"my-weird-port-name">();
  });

  it("intermediate function has correct signature", () => {
    const createLogger = port<Logger>();

    // The intermediate function should accept a string and return a Port
    expectTypeOf(createLogger).toBeFunction();
    expectTypeOf(createLogger("Test")).toEqualTypeOf<Port<Logger, "Test">>();
  });
});
