/**
 * DoD 12: Advanced Patterns - Type-Level Tests
 *
 * These tests verify:
 * 1. serializeMachineState returns Result<SerializedMachineState, SerializationError>
 * 2. restoreMachineState returns Result<{ state, context }, RestoreError>
 * 3. sendBatch returns Result<readonly EffectAny[], TransitionError>
 * 4. SerializationError narrowable via _tag
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type { Result } from "@hex-di/result";
import {
  serializeMachineState,
  restoreMachineState,
  defineMachine,
  createMachineRunner,
  createActivityManager,
  createBasicExecutor,
  type SerializedMachineState,
  type SerializationError,
  type RestoreError,
} from "../src/index.js";
import type { EffectAny } from "../src/effects/types.js";
import type { TransitionError } from "../src/errors/index.js";

// =============================================================================
// Test 1: serializeMachineState return type
// =============================================================================

describe("serializeMachineState returns Result<SerializedMachineState, SerializationError>", () => {
  it("return type matches", () => {
    const machine = defineMachine({
      id: "test",
      initial: "idle",
      states: { idle: { on: {} } },
    });
    const am = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: createBasicExecutor(),
      activityManager: am,
    });

    const result = serializeMachineState(runner, "test");
    expectTypeOf(result).toMatchTypeOf<Result<SerializedMachineState, SerializationError>>();
  });
});

// =============================================================================
// Test 2: restoreMachineState return type
// =============================================================================

describe("restoreMachineState returns Result<{ state, context }, RestoreError>", () => {
  it("return type matches", () => {
    const machine = defineMachine({
      id: "test",
      initial: "idle",
      states: { idle: { on: {} } },
    });

    const result = restoreMachineState(
      { version: 1, machineId: "test", state: "idle", context: undefined, timestamp: 0 },
      machine
    );

    expectTypeOf(result).toMatchTypeOf<
      Result<{ readonly state: string; readonly context: unknown }, RestoreError>
    >();
  });
});

// =============================================================================
// Test 3: sendBatch return type
// =============================================================================

describe("sendBatch returns Result<readonly EffectAny[], TransitionError>", () => {
  it("return type matches", () => {
    const machine = defineMachine({
      id: "test",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "idle" } } },
      },
    });
    const am = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: createBasicExecutor(),
      activityManager: am,
    });

    const result = runner.sendBatch([{ type: "GO" }]);
    expectTypeOf(result).toMatchTypeOf<Result<readonly EffectAny[], TransitionError>>();
  });
});

// =============================================================================
// Test 4: SerializationError narrowable via _tag
// =============================================================================

describe("SerializationError narrowable via _tag", () => {
  it("can narrow to NonSerializableContext", () => {
    type E = SerializationError;
    type Tag = E["_tag"];
    expectTypeOf<Tag>().toEqualTypeOf<"NonSerializableContext" | "CircularReference">();
  });

  it("can narrow to RestoreError variants", () => {
    type E = RestoreError;
    type Tag = E["_tag"];
    expectTypeOf<Tag>().toEqualTypeOf<"InvalidState" | "MachineIdMismatch">();
  });
});
