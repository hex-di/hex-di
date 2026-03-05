/**
 * Tests for BlameContext types and blame-aware errors.
 *
 * Tests verify:
 * 1. BlameContext structure and freezing (3.1)
 * 2. Error classes accept blame context (3.2)
 * 3. Blame-enhanced error formatting (3.5)
 * 4. Discriminated union pattern matching on violationType._tag
 */

import { describe, it, expect } from "vitest";
import {
  createBlameContext,
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  formatBlameError,
} from "../src/index.js";
import type { BlameContext, BlameViolationType } from "../src/index.js";

// =============================================================================
// 3.1: BlameContext Types
// =============================================================================

describe("BlameContext types", () => {
  it("createBlameContext returns a frozen context", () => {
    const blame = createBlameContext({
      adapterFactory: { name: "DatabaseAdapter" },
      portContract: { name: "Database", direction: "outbound" },
      violationType: { _tag: "FactoryError", error: new Error("connection failed") },
      resolutionPath: ["UserService", "Repository", "Database"],
    });

    expect(Object.isFrozen(blame)).toBe(true);
    expect(Object.isFrozen(blame.adapterFactory)).toBe(true);
    expect(Object.isFrozen(blame.portContract)).toBe(true);
    expect(Object.isFrozen(blame.violationType)).toBe(true);
    expect(Object.isFrozen(blame.resolutionPath)).toBe(true);
  });

  it("createBlameContext makes defensive copy of resolutionPath", () => {
    const path = ["A", "B", "C"];
    const blame = createBlameContext({
      adapterFactory: { name: "Adapter" },
      portContract: { name: "Port", direction: "inbound" },
      violationType: { _tag: "FactoryError", error: "boom" },
      resolutionPath: path,
    });

    path.push("D");
    expect(blame.resolutionPath).toEqual(["A", "B", "C"]);
  });

  it("discriminated union works with switch on violationType._tag", () => {
    const violations: BlameViolationType[] = [
      { _tag: "FactoryError", error: "boom" },
      { _tag: "LifetimeViolation", expected: "singleton", actual: "transient" },
      { _tag: "MissingDependency", missingPort: "Logger" },
      { _tag: "DisposalError", error: new Error("cleanup failed") },
      { _tag: "ContractViolation", details: "missing method doWork" },
    ];

    const tags: string[] = [];
    for (const violation of violations) {
      switch (violation._tag) {
        case "FactoryError":
          tags.push(`factory:${String(violation.error)}`);
          break;
        case "LifetimeViolation":
          tags.push(`lifetime:${violation.expected}->${violation.actual}`);
          break;
        case "MissingDependency":
          tags.push(`missing:${violation.missingPort}`);
          break;
        case "DisposalError":
          tags.push(`disposal:${String(violation.error)}`);
          break;
        case "ContractViolation":
          tags.push(`contract:${violation.details}`);
          break;
      }
    }

    expect(tags).toEqual([
      "factory:boom",
      "lifetime:singleton->transient",
      "missing:Logger",
      "disposal:Error: cleanup failed",
      "contract:missing method doWork",
    ]);
  });

  it("includes optional sourceLocation in adapterFactory", () => {
    const blame = createBlameContext({
      adapterFactory: { name: "DBAdapter", sourceLocation: "db-adapter.ts:15" },
      portContract: { name: "DB", direction: "outbound" },
      violationType: { _tag: "FactoryError", error: "err" },
      resolutionPath: ["DB"],
    });

    expect(blame.adapterFactory.sourceLocation).toBe("db-adapter.ts:15");
  });
});

// =============================================================================
// 3.2: Error Classes with Blame
// =============================================================================

describe("error classes with blame", () => {
  const sampleBlame: BlameContext = {
    adapterFactory: { name: "TestAdapter" },
    portContract: { name: "TestPort", direction: "outbound" },
    violationType: { _tag: "FactoryError", error: "test error" },
    resolutionPath: ["Root", "TestPort"],
  };

  it("FactoryError accepts blame context", () => {
    const err = new FactoryError("TestPort", new Error("boom"), sampleBlame);
    expect(err.blame).toBeDefined();
    expect(err.blame?.adapterFactory.name).toBe("TestAdapter");
    expect(err.blame?.portContract.name).toBe("TestPort");
    expect(err.blame?.resolutionPath).toEqual(["Root", "TestPort"]);
    expect(Object.isFrozen(err.blame)).toBe(true);
  });

  it("FactoryError works without blame (backward compatible)", () => {
    const err = new FactoryError("TestPort", new Error("boom"));
    expect(err.blame).toBeUndefined();
    expect(err.portName).toBe("TestPort");
  });

  it("CircularDependencyError accepts blame context", () => {
    const blame: BlameContext = {
      adapterFactory: { name: "unknown" },
      portContract: { name: "A", direction: "inbound" },
      violationType: { _tag: "MissingDependency", missingPort: "A" },
      resolutionPath: ["A", "B", "A"],
    };
    const err = new CircularDependencyError(["A", "B", "A"], blame);
    expect(err.blame).toBeDefined();
    expect(err.blame?.violationType._tag).toBe("MissingDependency");
    expect(Object.isFrozen(err.blame)).toBe(true);
  });

  it("DisposedScopeError accepts blame context", () => {
    const blame: BlameContext = {
      adapterFactory: { name: "DBAdapter" },
      portContract: { name: "DB", direction: "outbound" },
      violationType: { _tag: "DisposalError", error: "scope disposed" },
      resolutionPath: ["DB"],
    };
    const err = new DisposedScopeError("DB", blame);
    expect(err.blame).toBeDefined();
    expect(err.blame?.violationType._tag).toBe("DisposalError");
  });

  it("ScopeRequiredError accepts blame context", () => {
    const blame: BlameContext = {
      adapterFactory: { name: "SessionAdapter" },
      portContract: { name: "Session", direction: "inbound" },
      violationType: { _tag: "LifetimeViolation", expected: "scoped", actual: "singleton" },
      resolutionPath: ["Session"],
    };
    const err = new ScopeRequiredError("Session", blame);
    expect(err.blame).toBeDefined();
    expect(err.blame?.violationType._tag).toBe("LifetimeViolation");
  });

  it("blame on ContainerError is frozen", () => {
    const err = new FactoryError("Port", "err", sampleBlame);
    expect(Object.isFrozen(err.blame)).toBe(true);
    expect(Object.isFrozen(err.blame?.adapterFactory)).toBe(true);
    expect(Object.isFrozen(err.blame?.portContract)).toBe(true);
    expect(Object.isFrozen(err.blame?.violationType)).toBe(true);
    expect(Object.isFrozen(err.blame?.resolutionPath)).toBe(true);
  });

  it("blame is accessible from ContainerError base type", () => {
    const err: ContainerError = new FactoryError("Port", "err", sampleBlame);
    expect(err.blame?.adapterFactory.name).toBe("TestAdapter");
  });
});

// =============================================================================
// 3.5: Blame-Enhanced Error Formatting
// =============================================================================

describe("formatBlameError", () => {
  it("formats error with blame context using box-drawing characters", () => {
    const blame = createBlameContext({
      adapterFactory: { name: "DatabaseAdapter" },
      portContract: { name: "Database", direction: "outbound" },
      violationType: { _tag: "FactoryError", error: "ConnectionFailed" },
      resolutionPath: ["UserService", "Repository", "Database"],
    });
    const err = new FactoryError("Database", "ConnectionFailed", blame);

    const formatted = formatBlameError(err);

    expect(formatted).toContain("\u250C"); // top-left corner
    expect(formatted).toContain("\u2514"); // bottom-left corner
    expect(formatted).toContain("\u2502"); // vertical line
    expect(formatted).toContain('Port: "Database" (outbound)');
    expect(formatted).toContain("Adapter: DatabaseAdapter");
    expect(formatted).toContain("FactoryError");
    expect(formatted).toContain("UserService \u2192 Repository \u2192 Database");
  });

  it("returns plain message when no blame context", () => {
    const err = new FactoryError("Test", "boom");
    const formatted = formatBlameError(err);
    expect(formatted).toBe(err.message);
  });

  it("formats LifetimeViolation correctly", () => {
    const blame = createBlameContext({
      adapterFactory: { name: "CacheAdapter" },
      portContract: { name: "Cache", direction: "inbound" },
      violationType: { _tag: "LifetimeViolation", expected: "singleton", actual: "transient" },
      resolutionPath: ["AppRoot", "CacheService"],
    });
    const err = new ScopeRequiredError("Cache", blame);

    const formatted = formatBlameError(err);
    expect(formatted).toContain("LifetimeViolation");
    expect(formatted).toContain("expected singleton, got transient");
  });

  it("includes source location when present", () => {
    const blame = createBlameContext({
      adapterFactory: { name: "DBAdapter", sourceLocation: "db.ts:42" },
      portContract: { name: "DB", direction: "outbound" },
      violationType: { _tag: "FactoryError", error: "err" },
      resolutionPath: ["DB"],
    });
    const err = new FactoryError("DB", "err", blame);

    const formatted = formatBlameError(err);
    expect(formatted).toContain("DBAdapter (db.ts:42)");
  });

  it("snapshot: full formatted output", () => {
    const blame = createBlameContext({
      adapterFactory: { name: "DatabaseAdapter" },
      portContract: { name: "Database", direction: "outbound" },
      violationType: { _tag: "FactoryError", error: "ConnectionFailed" },
      resolutionPath: ["UserService", "Repository", "Database"],
    });
    const err = new FactoryError("Database", "ConnectionFailed", blame);

    const formatted = formatBlameError(err);
    expect(formatted).toMatchSnapshot();
  });
});
