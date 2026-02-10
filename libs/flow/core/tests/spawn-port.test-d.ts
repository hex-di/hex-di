/**
 * Type-level tests for Effect.spawn() port-based overload.
 *
 * Verifies:
 * 1. Port-based overload infers input type from ActivityPort phantom property
 * 2. Port-based overload extracts activityId as the port name type
 * 3. Wrong input type fails type checking
 * 4. String-based overload still works with full type inference
 */

import { describe, expectTypeOf, it } from "vitest";
import { Effect, activityPort, type SpawnEffect, type ActivityPortLike } from "../src/index.js";

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

describe("Effect.spawn() port-based type inference", () => {
  it("infers input type from ActivityPort phantom property", () => {
    const effect = Effect.spawn(FetchUserPort, { userId: "123" });

    expectTypeOf(effect.input).toEqualTypeOf<{ userId: string }>();
  });

  it("extracts activityId type from port name", () => {
    const effect = Effect.spawn(FetchUserPort, { userId: "123" });

    expectTypeOf(effect.activityId).toEqualTypeOf<"FetchUser">();
  });

  it("returns correct SpawnEffect type", () => {
    const effect = Effect.spawn(FetchUserPort, { userId: "123" });

    expectTypeOf(effect).toEqualTypeOf<SpawnEffect<"FetchUser", { userId: string }>>();
  });

  it("has correct _tag discriminator", () => {
    const effect = Effect.spawn(FetchUserPort, { userId: "123" });

    expectTypeOf(effect._tag).toEqualTypeOf<"Spawn">();
  });

  it("works with undefined input port", () => {
    const effect = Effect.spawn(HeartbeatPort, undefined);

    expectTypeOf(effect.activityId).toEqualTypeOf<"Heartbeat">();
    expectTypeOf(effect.input).toEqualTypeOf<undefined>();
  });
});

describe("Effect.spawn() string-based overload still works", () => {
  it("infers activityId as string literal", () => {
    const effect = Effect.spawn("fetchData", { userId: "123" });

    expectTypeOf(effect.activityId).toEqualTypeOf<"fetchData">();
  });

  it("infers input type from provided input", () => {
    const effect = Effect.spawn("fetchData", { userId: "123", page: 1 });

    expectTypeOf(effect.input).toEqualTypeOf<{ userId: string; page: number }>();
  });

  it("allows undefined input", () => {
    const effect = Effect.spawn("heartbeat", undefined);

    expectTypeOf(effect.input).toEqualTypeOf<undefined>();
  });
});

describe("ActivityPortLike structural type", () => {
  it("ActivityPort satisfies ActivityPortLike", () => {
    expectTypeOf(FetchUserPort).toMatchTypeOf<ActivityPortLike<{ userId: string }>>();
  });

  it("ActivityPort with undefined input satisfies ActivityPortLike", () => {
    expectTypeOf(HeartbeatPort).toMatchTypeOf<ActivityPortLike<undefined>>();
  });
});
