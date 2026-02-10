/**
 * Tests for Effect.spawn() port-based overload.
 *
 * Verifies:
 * 1. Effect.spawn(port, input) extracts activityId from port.__portName
 * 2. Effect.spawn(port, input) carries the correct input
 * 3. Effect.spawn(port, input) returns a frozen SpawnEffect
 * 4. String-based overload still works as before
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { Effect, activityPort } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface User {
  id: string;
  name: string;
}

const FetchUserPort = activityPort<{ userId: string }, User>()("FetchUser");
const HeartbeatPort = activityPort<undefined, void>()("Heartbeat");

// =============================================================================
// Tests
// =============================================================================

describe("Effect.spawn() port-based overload", () => {
  it("extracts activityId from port.__portName", () => {
    const effect = Effect.spawn(FetchUserPort, { userId: "123" });

    expect(effect._tag).toBe("Spawn");
    expect(effect.activityId).toBe("FetchUser");
  });

  it("carries the correct input", () => {
    const input = { userId: "abc-456" };
    const effect = Effect.spawn(FetchUserPort, input);

    expect(effect.input).toEqual({ userId: "abc-456" });
  });

  it("returns a frozen SpawnEffect", () => {
    const effect = Effect.spawn(FetchUserPort, { userId: "123" });

    expect(Object.isFrozen(effect)).toBe(true);
  });

  it("works with undefined input port", () => {
    const effect = Effect.spawn(HeartbeatPort, undefined);

    expect(effect._tag).toBe("Spawn");
    expect(effect.activityId).toBe("Heartbeat");
    expect(effect.input).toBeUndefined();
  });

  it("string-based overload still works", () => {
    const effect = Effect.spawn("fetchData", { userId: "123", page: 1 });

    expect(effect._tag).toBe("Spawn");
    expect(effect.activityId).toBe("fetchData");
    expect(effect.input).toEqual({ userId: "123", page: 1 });
  });

  it("string-based overload with undefined input still works", () => {
    const effect = Effect.spawn("heartbeat", undefined);

    expect(effect._tag).toBe("Spawn");
    expect(effect.activityId).toBe("heartbeat");
    expect(effect.input).toBeUndefined();
  });
});
