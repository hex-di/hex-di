/**
 * Runtime tests for the curried `port` function.
 */

import { describe, expect, it } from "vitest";
import { port } from "../src/index.js";

interface Logger {
  log(message: string): void;
}

describe("port() curried API", () => {
  it("returns a frozen port object", () => {
    const LoggerPort = port<Logger>()("Logger");

    expect(Object.isFrozen(LoggerPort)).toBe(true);
  });

  it("sets __portName to the provided name", () => {
    const LoggerPort = port<Logger>()("Logger");

    expect(LoggerPort.__portName).toBe("Logger");
  });

  it("works with different names", () => {
    const ConsoleLogger = port<Logger>()("ConsoleLogger");
    const FileLogger = port<Logger>()("FileLogger");

    expect(ConsoleLogger.__portName).toBe("ConsoleLogger");
    expect(FileLogger.__portName).toBe("FileLogger");
  });

  it("intermediate function can be reused", () => {
    const createLoggerPort = port<Logger>();

    const Port1 = createLoggerPort("Logger1");
    const Port2 = createLoggerPort("Logger2");

    expect(Port1.__portName).toBe("Logger1");
    expect(Port2.__portName).toBe("Logger2");
  });

  it("creates distinct port objects", () => {
    const Port1 = port<Logger>()("Logger");
    const Port2 = port<Logger>()("Logger");

    // Different object instances
    expect(Port1).not.toBe(Port2);
    // But same name
    expect(Port1.__portName).toBe(Port2.__portName);
  });
});
