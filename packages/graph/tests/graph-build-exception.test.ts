/**
 * Tests for GraphBuildException.
 *
 * Verifies that the exception class preserves full structured error
 * payload for audit trail reconstruction.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { GraphBuildException } from "../src/errors/graph-build-exception.js";
import { buildGraph } from "../src/builder/builder-build.js";
import { port, createAdapter } from "@hex-di/core";
import { clearAuditSink } from "../src/audit/global-sink.js";

// Suppress audit warnings in tests
clearAuditSink();

interface ServiceA {
  value: string;
}
interface ServiceB {
  value: number;
}

const PortA = port<ServiceA>()({ name: "ServiceA" });
const PortB = port<ServiceB>()({ name: "ServiceB" });

describe("GraphBuildException", () => {
  it("is instanceof Error", () => {
    const exception = new GraphBuildException({
      _tag: "CyclicDependency",
      cyclePath: ["A", "B", "A"],
      message: "Cycle detected",
    });
    expect(exception).toBeInstanceOf(Error);
  });

  it("preserves CyclicDependency payload via cause", () => {
    const exception = new GraphBuildException({
      _tag: "CyclicDependency",
      cyclePath: ["A", "B", "A"],
      message: "Cycle: A -> B -> A",
    });

    expect(exception.cause._tag).toBe("CyclicDependency");
    if (exception.cause._tag === "CyclicDependency") {
      expect(exception.cause.cyclePath).toEqual(["A", "B", "A"]);
    }
  });

  it("preserves CaptiveDependency payload via cause", () => {
    const exception = new GraphBuildException({
      _tag: "CaptiveDependency",
      dependentPort: "SingletonService",
      dependentLifetime: "singleton",
      captivePort: "ScopedService",
      captiveLifetime: "scoped",
      message: "Captive dependency detected",
    });

    expect(exception.cause._tag).toBe("CaptiveDependency");
    if (exception.cause._tag === "CaptiveDependency") {
      expect(exception.cause.dependentPort).toBe("SingletonService");
      expect(exception.cause.dependentLifetime).toBe("singleton");
      expect(exception.cause.captivePort).toBe("ScopedService");
      expect(exception.cause.captiveLifetime).toBe("scoped");
    }
  });

  it("message matches original error message", () => {
    const originalMessage = "Cycle: A -> B -> A";
    const exception = new GraphBuildException({
      _tag: "CyclicDependency",
      cyclePath: ["A", "B", "A"],
      message: originalMessage,
    });

    expect(exception.message).toBe(originalMessage);
  });

  it("name is GraphBuildException", () => {
    const exception = new GraphBuildException({
      _tag: "CyclicDependency",
      cyclePath: [],
      message: "test",
    });
    expect(exception.name).toBe("GraphBuildException");
  });

  it("cause is frozen", () => {
    const exception = new GraphBuildException({
      _tag: "CyclicDependency",
      cyclePath: ["A"],
      message: "test",
    });
    expect(Object.isFrozen(exception.cause)).toBe(true);
  });

  it("exception itself is frozen", () => {
    const exception = new GraphBuildException({
      _tag: "CyclicDependency",
      cyclePath: ["A"],
      message: "test",
    });
    expect(Object.isFrozen(exception)).toBe(true);
  });

  it("is thrown by buildGraph on captive dependency", () => {
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ value: "a" }),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ value: 42 }),
    });

    expect(() => {
      buildGraph({
        adapters: [AdapterA, AdapterB],
        overridePortNames: new Set<string>(),
      });
    }).toThrow(GraphBuildException);
  });

  it("thrown exception has structured cause on captive", () => {
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ value: "a" }),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ value: 42 }),
    });

    try {
      buildGraph({
        adapters: [AdapterA, AdapterB],
        overridePortNames: new Set<string>(),
      });
      expect.fail("Expected GraphBuildException");
    } catch (e) {
      expect(e).toBeInstanceOf(GraphBuildException);
      if (e instanceof GraphBuildException) {
        expect(e.cause._tag).toBe("CaptiveDependency");
      }
    }
  });
});
