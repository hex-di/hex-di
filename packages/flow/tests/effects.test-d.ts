/**
 * Type-level tests for Effect descriptors and constructors.
 *
 * These tests verify:
 * 1. Effect.invoke() infers port method signature correctly
 * 2. Effect.spawn() infers activity input type correctly
 * 3. Effect.emit() validates against event type
 * 4. Effect.parallel() and Effect.sequence() compose correctly
 * 5. All effect types are properly discriminated by _tag
 * 6. Port method extraction utilities work correctly
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { event, type Event } from "../src/machine/index.js";
import {
  Effect,
  type InvokeEffect,
  type SpawnEffect,
  type StopEffect,
  type EmitEffect,
  type DelayEffect,
  type ParallelEffect,
  type SequenceEffect,
  type NoneEffect,
  type EffectAny,
  type MethodNames,
  type MethodParams,
  type MethodReturn,
} from "../src/effects/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface UserService {
  getUser(id: string): Promise<{ name: string; email: string }>;
  updateUser(id: string, data: { name?: string; email?: string }): Promise<void>;
  deleteUser(id: string): Promise<boolean>;
}

interface LoggerService {
  log(message: string): void;
  error(message: string, error?: Error): void;
}

interface CalculatorService {
  add(a: number, b: number): number;
  multiply(a: number, b: number): number;
}

// Create port tokens
const UserServicePort = createPort<"UserService", UserService>("UserService");
const LoggerServicePort = createPort<"LoggerService", LoggerService>("LoggerService");
const CalculatorServicePort = createPort<"CalculatorService", CalculatorService>(
  "CalculatorService"
);

// =============================================================================
// Test 1: Effect.invoke() Infers Port Method Signature
// =============================================================================

describe("Effect.invoke() infers port method signature", () => {
  it("infers method name as string literal type", () => {
    const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);

    // Method name should be inferred as literal type
    expectTypeOf(effect.method).toEqualTypeOf<"getUser">();
  });

  it("infers args from method parameters", () => {
    const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);

    // Args should match method parameters
    expectTypeOf(effect.args).toEqualTypeOf<readonly [string]>();
  });

  it("infers result type from method return type", () => {
    const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);

    // Result type should be extracted from method return
    type ExpectedReturn = Promise<{ name: string; email: string }>;
    expectTypeOf(effect.__resultType).toEqualTypeOf<ExpectedReturn>();
  });

  it("works with multiple parameters", () => {
    const effect = Effect.invoke(UserServicePort, "updateUser", ["user-123", { name: "New Name" }]);

    expectTypeOf(effect.method).toEqualTypeOf<"updateUser">();
    expectTypeOf(effect.args).toEqualTypeOf<readonly [string, { name?: string; email?: string }]>();
    expectTypeOf(effect.__resultType).toEqualTypeOf<Promise<void>>();
  });

  it("works with void-returning methods", () => {
    const effect = Effect.invoke(LoggerServicePort, "log", ["Hello, world!"]);

    expectTypeOf(effect.method).toEqualTypeOf<"log">();
    expectTypeOf(effect.args).toEqualTypeOf<readonly [string]>();
    expectTypeOf(effect.__resultType).toEqualTypeOf<void>();
  });

  it("works with primitive-returning methods", () => {
    const effect = Effect.invoke(CalculatorServicePort, "add", [5, 3]);

    expectTypeOf(effect.method).toEqualTypeOf<"add">();
    expectTypeOf(effect.args).toEqualTypeOf<readonly [number, number]>();
    expectTypeOf(effect.__resultType).toEqualTypeOf<number>();
  });

  it("has correct _tag discriminator", () => {
    const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);

    expectTypeOf(effect._tag).toEqualTypeOf<"Invoke">();
  });

  it("preserves port reference for resolution", () => {
    const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);

    expectTypeOf(effect.port).toEqualTypeOf<typeof UserServicePort>();
  });
});

// =============================================================================
// Test 2: Effect.spawn() Infers Activity Input Type
// =============================================================================

describe("Effect.spawn() infers activity input type", () => {
  it("infers activity ID as string literal", () => {
    const effect = Effect.spawn("fetchData", { userId: "123" });

    expectTypeOf(effect.activityId).toEqualTypeOf<"fetchData">();
  });

  it("infers input type from provided input", () => {
    const effect = Effect.spawn("fetchData", { userId: "123", page: 1 });

    expectTypeOf(effect.input).toEqualTypeOf<{ userId: string; page: number }>();
  });

  it("allows undefined input for activities without input", () => {
    const effect = Effect.spawn("heartbeat", undefined);

    expectTypeOf(effect.input).toEqualTypeOf<undefined>();
  });

  it("has correct _tag discriminator", () => {
    const effect = Effect.spawn("fetchData", { userId: "123" });

    expectTypeOf(effect._tag).toEqualTypeOf<"Spawn">();
  });
});

// =============================================================================
// Test 3: Effect.emit() Validates Event Type
// =============================================================================

describe("Effect.emit() validates against event type", () => {
  it("accepts typed event from factory", () => {
    const createSuccess = event<"SUCCESS", { data: string }>("SUCCESS");
    const successEvent = createSuccess({ data: "result" });

    const effect = Effect.emit(successEvent);

    expectTypeOf(effect._tag).toEqualTypeOf<"Emit">();
    expectTypeOf(effect.event).toMatchTypeOf<Event<"SUCCESS", { data: string }>>();
  });

  it("preserves event type in EmitEffect", () => {
    type ErrorEvent = Event<"ERROR", { code: number }>;
    const createError = event<"ERROR", { code: number }>("ERROR");
    const errorEvent = createError({ code: 500 });

    const _effect = Effect.emit(errorEvent);

    // The effect should preserve the exact event type
    type EffectEventType = typeof _effect.event;
    expectTypeOf<EffectEventType>().toMatchTypeOf<ErrorEvent>();
  });

  it("works with event without payload", () => {
    const createReset = event<"RESET">("RESET");
    const resetEvent = createReset();

    const effect = Effect.emit(resetEvent);

    expectTypeOf(effect._tag).toEqualTypeOf<"Emit">();
    expectTypeOf(effect.event.type).toEqualTypeOf<"RESET">();
  });
});

// =============================================================================
// Test 4: Effect.parallel() and Effect.sequence() Compose Correctly
// =============================================================================

describe("Effect.parallel() and Effect.sequence() compose correctly", () => {
  it("parallel effect preserves array of effects", () => {
    const effect1 = Effect.invoke(LoggerServicePort, "log", ["Starting..."]);
    const effect2 = Effect.delay(100);
    const effect3 = Effect.invoke(LoggerServicePort, "log", ["Done!"]);

    const parallel = Effect.parallel([effect1, effect2, effect3] as const);

    expectTypeOf(parallel._tag).toEqualTypeOf<"Parallel">();
    expectTypeOf(parallel.effects).toMatchTypeOf<readonly EffectAny[]>();
  });

  it("sequence effect preserves array of effects", () => {
    const effect1 = Effect.invoke(LoggerServicePort, "log", ["Step 1"]);
    const effect2 = Effect.delay(50);
    const effect3 = Effect.invoke(LoggerServicePort, "log", ["Step 2"]);

    const sequence = Effect.sequence([effect1, effect2, effect3] as const);

    expectTypeOf(sequence._tag).toEqualTypeOf<"Sequence">();
    expectTypeOf(sequence.effects).toMatchTypeOf<readonly EffectAny[]>();
  });

  it("parallel and sequence can be nested", () => {
    const step1 = Effect.invoke(LoggerServicePort, "log", ["Step 1"]);
    const step2 = Effect.delay(100);

    const inner = Effect.parallel([step1, step2] as const);
    const outer = Effect.sequence([inner, Effect.none()] as const);

    expectTypeOf(outer._tag).toEqualTypeOf<"Sequence">();
    expectTypeOf(outer.effects[0]._tag).toEqualTypeOf<"Parallel">();
  });
});

// =============================================================================
// Test 5: All Effect Types Are Properly Discriminated by _tag
// =============================================================================

describe("all effect types are properly discriminated by _tag", () => {
  it("can narrow effect union by _tag", () => {
    type AnyEffect =
      | InvokeEffect<typeof UserServicePort, "getUser", readonly [string]>
      | SpawnEffect<"fetchData", { userId: string }>
      | StopEffect<"fetchData">
      | EmitEffect<Event<"SUCCESS", { data: string }>>
      | DelayEffect
      | ParallelEffect<readonly EffectAny[]>
      | SequenceEffect<readonly EffectAny[]>
      | NoneEffect;

    // Function that narrows the effect
    const narrowEffect = (e: AnyEffect) => {
      switch (e._tag) {
        case "Invoke":
          expectTypeOf(e.port).toMatchTypeOf<typeof UserServicePort>();
          expectTypeOf(e.method).toEqualTypeOf<"getUser">();
          break;
        case "Spawn":
          expectTypeOf(e.activityId).toEqualTypeOf<"fetchData">();
          expectTypeOf(e.input).toMatchTypeOf<{ userId: string }>();
          break;
        case "Stop":
          expectTypeOf(e.activityId).toEqualTypeOf<"fetchData">();
          break;
        case "Emit":
          expectTypeOf(e.event).toMatchTypeOf<Event<"SUCCESS", { data: string }>>();
          break;
        case "Delay":
          expectTypeOf(e.milliseconds).toEqualTypeOf<number>();
          break;
        case "Parallel":
          expectTypeOf(e.effects).toMatchTypeOf<readonly EffectAny[]>();
          break;
        case "Sequence":
          expectTypeOf(e.effects).toMatchTypeOf<readonly EffectAny[]>();
          break;
        case "None":
          expectTypeOf(e._tag).toEqualTypeOf<"None">();
          break;
      }
    };

    expectTypeOf(narrowEffect).toBeFunction();
  });

  it("EffectAny accepts all effect types", () => {
    const invoke = Effect.invoke(LoggerServicePort, "log", ["test"]);
    const spawn = Effect.spawn("activity", { data: 1 });
    const stop = Effect.stop("activity");
    const emit = Effect.emit(event<"EVENT", { x: number }>("EVENT")({ x: 1 }));
    const delay = Effect.delay(100);
    const none = Effect.none();

    // All should be assignable to EffectAny
    expectTypeOf(invoke).toMatchTypeOf<EffectAny>();
    expectTypeOf(spawn).toMatchTypeOf<EffectAny>();
    expectTypeOf(stop).toMatchTypeOf<EffectAny>();
    expectTypeOf(emit).toMatchTypeOf<EffectAny>();
    expectTypeOf(delay).toMatchTypeOf<EffectAny>();
    expectTypeOf(none).toMatchTypeOf<EffectAny>();
  });
});

// =============================================================================
// Test 6: Port Method Extraction Utilities
// =============================================================================

describe("port method extraction utilities", () => {
  it("MethodNames extracts method names from service interface", () => {
    type UserMethods = MethodNames<UserService>;

    // Should extract all method names as union
    expectTypeOf<UserMethods>().toEqualTypeOf<"getUser" | "updateUser" | "deleteUser">();
  });

  it("MethodParams extracts method parameters", () => {
    type GetUserParams = MethodParams<UserService, "getUser">;
    type UpdateUserParams = MethodParams<UserService, "updateUser">;

    expectTypeOf<GetUserParams>().toEqualTypeOf<[id: string]>();
    expectTypeOf<UpdateUserParams>().toEqualTypeOf<
      [id: string, data: { name?: string; email?: string }]
    >();
  });

  it("MethodReturn extracts method return type", () => {
    type GetUserReturn = MethodReturn<UserService, "getUser">;
    type DeleteUserReturn = MethodReturn<UserService, "deleteUser">;

    expectTypeOf<GetUserReturn>().toEqualTypeOf<Promise<{ name: string; email: string }>>();
    expectTypeOf<DeleteUserReturn>().toEqualTypeOf<Promise<boolean>>();
  });

  it("works with synchronous methods", () => {
    type LogMethods = MethodNames<LoggerService>;
    type LogParams = MethodParams<LoggerService, "log">;
    type LogReturn = MethodReturn<LoggerService, "log">;

    expectTypeOf<LogMethods>().toEqualTypeOf<"log" | "error">();
    expectTypeOf<LogParams>().toEqualTypeOf<[message: string]>();
    expectTypeOf<LogReturn>().toEqualTypeOf<void>();
  });

  it("handles optional parameters", () => {
    type ErrorParams = MethodParams<LoggerService, "error">;

    expectTypeOf<ErrorParams>().toEqualTypeOf<[message: string, error?: Error]>();
  });
});
