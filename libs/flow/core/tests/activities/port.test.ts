/**
 * Unit tests for Activity Port (DoD 5).
 *
 * Tests runtime behavior of activityPort factory:
 * 1. Port creation via curried factory
 * 2. Port name is set correctly at runtime
 * 3. Port is frozen (immutable)
 */

import { describe, it, expect } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import { activityPort } from "../../src/activities/port.js";
import { createFlowPort } from "../../src/integration/port.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface UserInput {
  userId: string;
}

interface UserOutput {
  name: string;
  email: string;
}

// =============================================================================
// Tests
// =============================================================================

describe("activityPort factory", () => {
  it("creates a port with the correct __portName", () => {
    const FetchUserPort = activityPort<UserInput, UserOutput>()("FetchUser");
    expect(FetchUserPort.__portName).toBe("FetchUser");
  });

  it("returns a frozen object", () => {
    const FetchUserPort = activityPort<UserInput, UserOutput>()("FetchUser");
    expect(Object.isFrozen(FetchUserPort)).toBe(true);
  });

  it("creates distinct ports for different names", () => {
    const PortA = activityPort<UserInput, UserOutput>()("PortA");
    const PortB = activityPort<UserInput, UserOutput>()("PortB");
    expect(PortA.__portName).toBe("PortA");
    expect(PortB.__portName).toBe("PortB");
    expect(PortA).not.toBe(PortB);
  });

  it("curried factory returns a function on first call", () => {
    const factory = activityPort<UserInput, UserOutput>();
    expect(typeof factory).toBe("function");
  });

  it("port only has __portName as enumerable key at runtime", () => {
    const port = activityPort<UserInput, UserOutput>()("Test");
    const keys = Object.keys(port);
    expect(keys).toEqual(["__portName"]);
  });
});

describe("flow port metadata category for library detection", () => {
  it("createFlowPort sets category to flow/flow", () => {
    const port = createFlowPort<"a" | "b", "GO", object>("TestFlow");
    expect(getPortMetadata(port)?.category).toBe("flow/flow");
  });

  it("activityPort sets category to flow/activity", () => {
    const port = activityPort<UserInput, UserOutput>()("FetchUser");
    expect(getPortMetadata(port)?.category).toBe("flow/activity");
  });
});
