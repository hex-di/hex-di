/**
 * Runtime tests for protocol state machines.
 *
 * Verifies:
 * - defineProtocol creates frozen ProtocolSpec
 * - Validation rejects invalid transition targets
 * - Validation rejects invalid initial states
 * - isMethodAvailable, getNextState, getAvailableMethodNames utilities
 * - InvalidProtocolError properties and freezing
 *
 * Requirements tested:
 * - BEH-CO-12-001: Port Interface with Phantom State Parameter (runtime)
 * - BEH-CO-12-002: State Transition Types (runtime validation)
 * - BEH-CO-12-003: Invalid Sequence Detection (runtime utilities)
 */

import { describe, it, expect } from "vitest";
import {
  defineProtocol,
  InvalidProtocolError,
  isMethodAvailable,
  getNextState,
  getAvailableMethodNames,
} from "../src/index.js";

// =============================================================================
// defineProtocol — valid protocols
// =============================================================================

describe("defineProtocol", () => {
  it("creates a frozen ProtocolSpec for a two-state protocol", () => {
    const spec = defineProtocol({
      name: "DatabaseConnection",
      states: ["disconnected", "connected"] as const,
      initialState: "disconnected",
      transitions: {
        disconnected: { connect: "connected" },
        connected: { query: "connected", close: "disconnected" },
      },
    });

    expect(spec.name).toBe("DatabaseConnection");
    expect(spec.states).toEqual(["disconnected", "connected"]);
    expect(spec.initialState).toBe("disconnected");
    expect(spec.transitions).toEqual({
      disconnected: { connect: "connected" },
      connected: { query: "connected", close: "disconnected" },
    });
  });

  it("creates a frozen ProtocolSpec for a three-state protocol", () => {
    const spec = defineProtocol({
      name: "FileHandle",
      states: ["closed", "open", "locked"] as const,
      initialState: "closed",
      transitions: {
        closed: { open: "open" },
        open: { read: "open", lock: "locked", close: "closed" },
        locked: { write: "locked", unlock: "open" },
      },
    });

    expect(spec.name).toBe("FileHandle");
    expect(spec.states).toEqual(["closed", "open", "locked"]);
    expect(spec.initialState).toBe("closed");
  });

  it("freezes the returned spec", () => {
    const spec = defineProtocol({
      name: "Test",
      states: ["a", "b"] as const,
      initialState: "a",
      transitions: {
        a: { go: "b" },
        b: { back: "a" },
      },
    });

    expect(Object.isFrozen(spec)).toBe(true);
  });

  it("freezes the states array", () => {
    const spec = defineProtocol({
      name: "Test",
      states: ["a", "b"] as const,
      initialState: "a",
      transitions: {
        a: { go: "b" },
        b: { back: "a" },
      },
    });

    expect(Object.isFrozen(spec.states)).toBe(true);
  });

  it("freezes each transition entry", () => {
    const spec = defineProtocol({
      name: "Test",
      states: ["a", "b"] as const,
      initialState: "a",
      transitions: {
        a: { go: "b" },
        b: { back: "a" },
      },
    });

    expect(Object.isFrozen(spec.transitions)).toBe(true);
    expect(Object.isFrozen(spec.transitions["a"])).toBe(true);
    expect(Object.isFrozen(spec.transitions["b"])).toBe(true);
  });

  it("handles single-state protocol with self-transition", () => {
    const spec = defineProtocol({
      name: "Counter",
      states: ["counting"] as const,
      initialState: "counting",
      transitions: {
        counting: { increment: "counting", decrement: "counting" },
      },
    });

    expect(spec.states).toEqual(["counting"]);
    expect(spec.transitions["counting"]).toEqual({
      increment: "counting",
      decrement: "counting",
    });
  });
});

// =============================================================================
// defineProtocol — validation errors
// =============================================================================

describe("defineProtocol validation", () => {
  it("throws InvalidProtocolError for initial state not in states", () => {
    expect(() =>
      defineProtocol({
        name: "Bad",
        states: ["a", "b"] as const,
        initialState: "c" as "a",
        transitions: {
          a: { go: "b" },
          b: { back: "a" },
        },
      })
    ).toThrow(InvalidProtocolError);
  });

  it("error message mentions the invalid initial state", () => {
    try {
      defineProtocol({
        name: "Bad",
        states: ["a", "b"] as const,
        initialState: "c" as "a",
        transitions: {
          a: { go: "b" },
          b: { back: "a" },
        },
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidProtocolError);
      const protocolErr = err as InstanceType<typeof InvalidProtocolError>;
      expect(protocolErr.protocolName).toBe("Bad");
      expect(protocolErr.reason).toContain("c");
      expect(protocolErr.reason).toContain("Initial state");
    }
  });

  it("throws for transition target not in states", () => {
    expect(() =>
      defineProtocol({
        name: "Bad",
        states: ["a", "b"] as const,
        initialState: "a",
        transitions: {
          a: { go: "c" as "b" },
          b: { back: "a" },
        },
      })
    ).toThrow(InvalidProtocolError);
  });

  it("error for invalid target mentions source state and method", () => {
    try {
      defineProtocol({
        name: "BadTarget",
        states: ["a", "b"] as const,
        initialState: "a",
        transitions: {
          a: { go: "c" as "b" },
          b: { back: "a" },
        },
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidProtocolError);
      const protocolErr = err as InstanceType<typeof InvalidProtocolError>;
      expect(protocolErr.protocolName).toBe("BadTarget");
      expect(protocolErr.reason).toContain("c");
      expect(protocolErr.reason).toContain("a");
      expect(protocolErr.reason).toContain("go");
    }
  });
});

// =============================================================================
// InvalidProtocolError
// =============================================================================

describe("InvalidProtocolError", () => {
  it("has correct properties", () => {
    const err = new InvalidProtocolError("TestProto", "bad reason");

    expect(err._tag).toBe("InvalidProtocol");
    expect(err.code).toBe("INVALID_PROTOCOL");
    expect(err.isProgrammingError).toBe(true);
    expect(err.protocolName).toBe("TestProto");
    expect(err.reason).toBe("bad reason");
    expect(err.message).toContain("TestProto");
    expect(err.message).toContain("bad reason");
  });

  it("is frozen", () => {
    const err = new InvalidProtocolError("TestProto", "reason");
    expect(Object.isFrozen(err)).toBe(true);
  });

  it("is an instance of Error", () => {
    const err = new InvalidProtocolError("TestProto", "reason");
    expect(err).toBeInstanceOf(Error);
  });
});

// =============================================================================
// isMethodAvailable
// =============================================================================

describe("isMethodAvailable", () => {
  const spec = defineProtocol({
    name: "DB",
    states: ["disconnected", "connected"] as const,
    initialState: "disconnected",
    transitions: {
      disconnected: { connect: "connected" },
      connected: { query: "connected", close: "disconnected" },
    },
  });

  it("returns true for available method", () => {
    expect(isMethodAvailable(spec, "disconnected", "connect")).toBe(true);
    expect(isMethodAvailable(spec, "connected", "query")).toBe(true);
    expect(isMethodAvailable(spec, "connected", "close")).toBe(true);
  });

  it("returns false for unavailable method", () => {
    expect(isMethodAvailable(spec, "disconnected", "query")).toBe(false);
    expect(isMethodAvailable(spec, "disconnected", "close")).toBe(false);
    expect(isMethodAvailable(spec, "connected", "connect")).toBe(false);
  });

  it("returns false for unknown state", () => {
    expect(isMethodAvailable(spec, "unknown", "connect")).toBe(false);
  });

  it("returns false for unknown method", () => {
    expect(isMethodAvailable(spec, "connected", "unknown")).toBe(false);
  });
});

// =============================================================================
// getNextState
// =============================================================================

describe("getNextState", () => {
  const spec = defineProtocol({
    name: "DB",
    states: ["disconnected", "connected"] as const,
    initialState: "disconnected",
    transitions: {
      disconnected: { connect: "connected" },
      connected: { query: "connected", close: "disconnected" },
    },
  });

  it("returns correct next state for valid transitions", () => {
    expect(getNextState(spec, "disconnected", "connect")).toBe("connected");
    expect(getNextState(spec, "connected", "query")).toBe("connected");
    expect(getNextState(spec, "connected", "close")).toBe("disconnected");
  });

  it("returns undefined for invalid transitions", () => {
    expect(getNextState(spec, "disconnected", "query")).toBeUndefined();
    expect(getNextState(spec, "connected", "connect")).toBeUndefined();
  });

  it("returns undefined for unknown state", () => {
    expect(getNextState(spec, "unknown", "connect")).toBeUndefined();
  });

  it("returns undefined for unknown method", () => {
    expect(getNextState(spec, "connected", "unknown")).toBeUndefined();
  });
});

// =============================================================================
// getAvailableMethodNames
// =============================================================================

describe("getAvailableMethodNames", () => {
  const spec = defineProtocol({
    name: "DB",
    states: ["disconnected", "connected"] as const,
    initialState: "disconnected",
    transitions: {
      disconnected: { connect: "connected" },
      connected: { query: "connected", close: "disconnected" },
    },
  });

  it("returns available methods for disconnected state", () => {
    const methods = getAvailableMethodNames(spec, "disconnected");
    expect(methods).toEqual(["connect"]);
  });

  it("returns available methods for connected state", () => {
    const methods = getAvailableMethodNames(spec, "connected");
    expect(methods).toEqual(expect.arrayContaining(["query", "close"]));
    expect(methods).toHaveLength(2);
  });

  it("returns empty frozen array for unknown state", () => {
    const methods = getAvailableMethodNames(spec, "unknown");
    expect(methods).toEqual([]);
    expect(Object.isFrozen(methods)).toBe(true);
  });

  it("returns frozen arrays", () => {
    const methods = getAvailableMethodNames(spec, "disconnected");
    expect(Object.isFrozen(methods)).toBe(true);
  });
});

// =============================================================================
// End-to-end: Protocol spec drives runtime method validation
// =============================================================================

describe("End-to-end: runtime protocol validation", () => {
  it("simulates a full protocol lifecycle with runtime checks", () => {
    const spec = defineProtocol({
      name: "DatabaseConnection",
      states: ["disconnected", "connected"] as const,
      initialState: "disconnected",
      transitions: {
        disconnected: { connect: "connected" },
        connected: { query: "connected", close: "disconnected" },
      },
    });

    // Start in initial state
    let currentState: string = spec.initialState;
    expect(currentState).toBe("disconnected");

    // connect() is available
    expect(isMethodAvailable(spec, currentState, "connect")).toBe(true);
    expect(isMethodAvailable(spec, currentState, "query")).toBe(false);

    // Transition: connect
    const nextState = getNextState(spec, currentState, "connect");
    expect(nextState).toBe("connected");
    currentState = nextState ?? currentState;

    // Now query() and close() are available
    expect(isMethodAvailable(spec, currentState, "query")).toBe(true);
    expect(isMethodAvailable(spec, currentState, "close")).toBe(true);
    expect(isMethodAvailable(spec, currentState, "connect")).toBe(false);

    // Transition: query (self-transition)
    const afterQuery = getNextState(spec, currentState, "query");
    expect(afterQuery).toBe("connected");
    currentState = afterQuery ?? currentState;

    // Transition: close
    const afterClose = getNextState(spec, currentState, "close");
    expect(afterClose).toBe("disconnected");
    currentState = afterClose ?? currentState;

    // Back to initial state
    expect(currentState).toBe(spec.initialState);
    expect(isMethodAvailable(spec, currentState, "connect")).toBe(true);
    expect(isMethodAvailable(spec, currentState, "query")).toBe(false);
  });
});
