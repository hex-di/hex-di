/**
 * Unit tests for Activity Port (DoD 5).
 *
 * Tests runtime behavior of activityPort factory:
 * 1. Port creation via curried factory
 * 2. Port name is set correctly at runtime
 * 3. Port is frozen (immutable)
 */

import { describe, it, expect } from "vitest";
import { activityPort } from "../../src/activities/port.js";

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

  it("port only has __portName at runtime", () => {
    const port = activityPort<UserInput, UserOutput>()("Test");
    const keys = Object.keys(port);
    expect(keys).toEqual(["__portName"]);
  });
});
