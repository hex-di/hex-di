/**
 * Tests for public API surface.
 *
 * These tests verify:
 * 1. `createPort` is exported and callable
 * 2. `Port` type is exported and usable
 * 3. Utility types are exported
 * 4. No internal implementation details are leaked
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createPort, port, InferPortName, InferService, type Port } from "../src/index.js";

// Sample service interface for testing
interface TestService {
  execute(): void;
}

describe("Public API exports", () => {
  it("createPort is exported and callable", () => {
    // createPort should be a function
    expect(typeof createPort).toBe("function");

    // Should be callable and return a port object
    const port = createPort<"TestPort", TestService>("TestPort");
    expect(port).toBeDefined();
    expect(port.__portName).toBe("TestPort");
  });

  it("Port type is exported and usable for type annotations", () => {
    // Port type should be usable in type annotations
    const port: Port<TestService, "TypedPort"> = createPort<"TypedPort", TestService>("TypedPort");

    // Verify the type annotation works correctly
    expectTypeOf(port).toMatchTypeOf<Port<TestService, "TypedPort">>();
    expectTypeOf(port.__portName).toEqualTypeOf<"TypedPort">();
  });

  it("port (curried API) is exported and callable", () => {
    // port should be a function
    expect(typeof port).toBe("function");

    // Should return a function that creates a port
    const createLogger = port<TestService>();
    expect(typeof createLogger).toBe("function");

    // Should create a port with inferred name
    const loggerPort = createLogger("CurriedPort");
    expect(loggerPort).toBeDefined();
    expect(loggerPort.__portName).toBe("CurriedPort");

    // Verify type inference works
    expectTypeOf(loggerPort).toEqualTypeOf<Port<TestService, "CurriedPort">>();
  });

  it("utility types InferService and InferPortName are exported and functional", () => {
    // Create a port to test utility types against
    const port = createPort<"UtilityTest", TestService>("UtilityTest");
    expect(port).toBeDefined();
    type PortType = typeof port;

    // InferService should extract the service type
    type ExtractedService = InferService<PortType>;
    expectTypeOf<ExtractedService>().toEqualTypeOf<TestService>();

    // InferPortName should extract the name literal type
    type ExtractedName = InferPortName<PortType>;
    expectTypeOf<ExtractedName>().toEqualTypeOf<"UtilityTest">();
  });
});
