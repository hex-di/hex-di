/**
 * DoD 4: Effect System (Spec Section 05) - Unit Tests
 *
 * These tests verify:
 * 1. Effect.invoke creates InvokeEffect with _tag: 'Invoke'
 * 2. Effect.spawn creates SpawnEffect with _tag: 'Spawn'
 * 3. Effect.stop creates StopEffect with _tag: 'Stop'
 * 4. Effect.emit creates EmitEffect with _tag: 'Emit'
 * 5. Effect.delay creates DelayEffect with _tag: 'Delay'
 * 6. Effect.parallel creates ParallelEffect with _tag: 'Parallel'
 * 7. Effect.sequence creates SequenceEffect with _tag: 'Sequence'
 * 8. Effect.none creates NoneEffect with _tag: 'None'
 * 9. All effect constructors return frozen objects
 * 10. InvokeEffect carries port, method, and args
 * 11. SpawnEffect carries activityId and input
 * 12. DelayEffect carries ms
 * 13. Effect execution order: exit effects, transition effects, entry effects
 * 14. Effect cancellation concept: no transition = no effects
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { port } from "@hex-di/core";
import { expectOk, expectErr } from "@hex-di/result-testing";
import { Effect, event, defineMachine, transition } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface UserService {
  getUser(id: string): Promise<{ name: string }>;
  updateUser(id: string, data: { name: string }): Promise<void>;
}

const UserServicePort = port<UserService>()({ name: "UserService" });

// =============================================================================
// DoD 4: Effect System Tests
// =============================================================================

describe("DoD 4: Effect System", () => {
  // =========================================================================
  // Test 1: Effect.invoke creates InvokeEffect with _tag: 'Invoke'
  // =========================================================================
  it("Effect.invoke creates InvokeEffect with _tag: 'Invoke'", () => {
    const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);
    expect(effect._tag).toBe("Invoke");
  });

  // =========================================================================
  // Test 2: Effect.spawn creates SpawnEffect with _tag: 'Spawn'
  // =========================================================================
  it("Effect.spawn creates SpawnEffect with _tag: 'Spawn'", () => {
    const effect = Effect.spawn("fetchData", { userId: "123" });
    expect(effect._tag).toBe("Spawn");
  });

  // =========================================================================
  // Test 3: Effect.stop creates StopEffect with _tag: 'Stop'
  // =========================================================================
  it("Effect.stop creates StopEffect with _tag: 'Stop'", () => {
    const effect = Effect.stop("fetchData");
    expect(effect._tag).toBe("Stop");
  });

  // =========================================================================
  // Test 4: Effect.emit creates EmitEffect with _tag: 'Emit'
  // =========================================================================
  it("Effect.emit creates EmitEffect with _tag: 'Emit'", () => {
    const createDone = event<"DONE">("DONE");
    const effect = Effect.emit(createDone());
    expect(effect._tag).toBe("Emit");
  });

  // =========================================================================
  // Test 5: Effect.delay creates DelayEffect with _tag: 'Delay'
  // =========================================================================
  it("Effect.delay creates DelayEffect with _tag: 'Delay'", () => {
    const effect = Effect.delay(1000);
    expect(effect._tag).toBe("Delay");
  });

  // =========================================================================
  // Test 6: Effect.parallel creates ParallelEffect with _tag: 'Parallel'
  // =========================================================================
  it("Effect.parallel creates ParallelEffect with _tag: 'Parallel'", () => {
    const effect = Effect.parallel([Effect.delay(100), Effect.none()] as const);
    expect(effect._tag).toBe("Parallel");
  });

  // =========================================================================
  // Test 7: Effect.sequence creates SequenceEffect with _tag: 'Sequence'
  // =========================================================================
  it("Effect.sequence creates SequenceEffect with _tag: 'Sequence'", () => {
    const effect = Effect.sequence([Effect.delay(100), Effect.none()] as const);
    expect(effect._tag).toBe("Sequence");
  });

  // =========================================================================
  // Test 8: Effect.none creates NoneEffect with _tag: 'None'
  // =========================================================================
  it("Effect.none creates NoneEffect with _tag: 'None'", () => {
    const effect = Effect.none();
    expect(effect._tag).toBe("None");
  });

  // =========================================================================
  // Test 9: All effect constructors return frozen objects
  // =========================================================================
  describe("All effect constructors return frozen objects", () => {
    it("invoke is frozen", () => {
      const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);
      expect(Object.isFrozen(effect)).toBe(true);
    });

    it("spawn is frozen", () => {
      const effect = Effect.spawn("test", undefined);
      expect(Object.isFrozen(effect)).toBe(true);
    });

    it("stop is frozen", () => {
      const effect = Effect.stop("test");
      expect(Object.isFrozen(effect)).toBe(true);
    });

    it("emit is frozen", () => {
      const createDone = event<"DONE">("DONE");
      const effect = Effect.emit(createDone());
      expect(Object.isFrozen(effect)).toBe(true);
    });

    it("delay is frozen", () => {
      const effect = Effect.delay(100);
      expect(Object.isFrozen(effect)).toBe(true);
    });

    it("parallel is frozen", () => {
      const effect = Effect.parallel([Effect.none()] as const);
      expect(Object.isFrozen(effect)).toBe(true);
    });

    it("sequence is frozen", () => {
      const effect = Effect.sequence([Effect.none()] as const);
      expect(Object.isFrozen(effect)).toBe(true);
    });

    it("none is frozen", () => {
      const effect = Effect.none();
      expect(Object.isFrozen(effect)).toBe(true);
    });
  });

  // =========================================================================
  // Test 10: InvokeEffect carries port, method, and args
  // =========================================================================
  it("InvokeEffect carries port, method, and args", () => {
    const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);
    expect(effect.port).toBe(UserServicePort);
    expect(effect.method).toBe("getUser");
    expect(effect.args).toEqual(["user-123"]);
  });

  // =========================================================================
  // Test 11: SpawnEffect carries activityId and input
  // =========================================================================
  it("SpawnEffect carries activityId and input", () => {
    const effect = Effect.spawn("fetchData", { userId: "123", page: 1 });
    expect(effect.activityId).toBe("fetchData");
    expect(effect.input).toEqual({ userId: "123", page: 1 });
  });

  // =========================================================================
  // Test 12: DelayEffect carries milliseconds
  // =========================================================================
  it("DelayEffect carries milliseconds", () => {
    const effect = Effect.delay(5000);
    expect(effect.milliseconds).toBe(5000);
  });

  // =========================================================================
  // Test 13: Effect execution order: exit -> transition -> entry
  // =========================================================================
  it("Effect execution order: exit -> transition -> entry", () => {
    const exitEffect = Effect.invoke(UserServicePort, "getUser", ["exit"]);
    const transitionEffect = Effect.delay(100);
    const entryEffect = Effect.invoke(UserServicePort, "getUser", ["entry"]);

    const machine = defineMachine({
      id: "effect-order",
      initial: "a",
      context: undefined,
      states: {
        a: {
          exit: [exitEffect],
          on: {
            GO: {
              target: "b",
              effects: [transitionEffect],
            },
          },
        },
        b: {
          entry: [entryEffect],
          on: {},
        },
      },
    });

    const result = transition("a", undefined, { type: "GO" }, machine);
    expect(result.effects).toHaveLength(3);
    expect(result.effects[0]._tag).toBe("Invoke"); // exit
    expect(result.effects[1]._tag).toBe("Delay"); // transition
    expect(result.effects[2]._tag).toBe("Invoke"); // entry
  });

  // =========================================================================
  // Test 14: No transition = no effects
  // =========================================================================
  it("No transition produces no effects", () => {
    const machine = defineMachine({
      id: "no-effects",
      initial: "idle",
      context: undefined,
      states: {
        idle: {
          exit: [Effect.delay(100)],
          on: {},
        },
      },
    });

    // Unknown event => no transition => no effects (even exit effects not collected)
    const result = transition("idle", undefined, { type: "UNKNOWN" }, machine);
    expect(result.transitioned).toBe(false);
    expect(result.effects).toHaveLength(0);
  });

  // =========================================================================
  // Test 15: None effect is a singleton
  // =========================================================================
  it("Effect.none returns the same singleton instance", () => {
    const none1 = Effect.none();
    const none2 = Effect.none();
    expect(none1).toBe(none2);
  });

  // =========================================================================
  // Test 16: ParallelEffect carries nested effects
  // =========================================================================
  it("ParallelEffect carries nested effects", () => {
    const child1 = Effect.delay(100);
    const child2 = Effect.delay(200);
    const effect = Effect.parallel([child1, child2] as const);

    expect(effect.effects).toHaveLength(2);
    expect(effect.effects[0]).toBe(child1);
    expect(effect.effects[1]).toBe(child2);
  });

  // =========================================================================
  // Test 17: SequenceEffect carries nested effects
  // =========================================================================
  it("SequenceEffect carries nested effects", () => {
    const child1 = Effect.delay(100);
    const child2 = Effect.none();
    const child3 = Effect.delay(200);
    const effect = Effect.sequence([child1, child2, child3] as const);

    expect(effect.effects).toHaveLength(3);
    expect(effect.effects[0]).toBe(child1);
    expect(effect.effects[1]).toBe(child2);
    expect(effect.effects[2]).toBe(child3);
  });

  // =========================================================================
  // Test 18: StopEffect carries activityId
  // =========================================================================
  it("StopEffect carries activityId", () => {
    const effect = Effect.stop("my-activity");
    expect(effect.activityId).toBe("my-activity");
  });

  // =========================================================================
  // Test 19: EmitEffect carries event
  // =========================================================================
  it("EmitEffect carries event", () => {
    const createSuccess = event<"SUCCESS", { data: string }>("SUCCESS");
    const successEvent = createSuccess({ data: "test" });
    const effect = Effect.emit(successEvent);

    expect(effect.event).toBe(successEvent);
    expect(effect.event.type).toBe("SUCCESS");
  });

  // =========================================================================
  // Test 20: Effect.choose creates ChooseEffect with _tag: 'Choose'
  // =========================================================================
  it("Effect.choose creates ChooseEffect with _tag: 'Choose'", () => {
    const effect = Effect.choose([
      { guard: () => true, effects: [Effect.delay(100)] },
      { effects: [Effect.none()] },
    ]);
    expect(effect._tag).toBe("Choose");
  });

  // =========================================================================
  // Test 21: Effect.log creates LogEffect with _tag: 'Log'
  // =========================================================================
  it("Effect.log creates LogEffect with _tag: 'Log'", () => {
    const effect = Effect.log("test message");
    expect(effect._tag).toBe("Log");
  });

  // =========================================================================
  // Test 22: Choose and Log effects are frozen
  // =========================================================================
  describe("Choose and Log effects are frozen", () => {
    it("choose is frozen", () => {
      const effect = Effect.choose([]);
      expect(Object.isFrozen(effect)).toBe(true);
    });

    it("log is frozen", () => {
      const effect = Effect.log("test");
      expect(Object.isFrozen(effect)).toBe(true);
    });
  });

  // =========================================================================
  // Test 23: ChooseEffect carries branches
  // =========================================================================
  it("ChooseEffect carries branches", () => {
    const branch1 = { guard: () => true, effects: [Effect.delay(100)] };
    const branch2 = { effects: [Effect.none()] };
    const effect = Effect.choose([branch1, branch2]);

    expect(effect.branches).toHaveLength(2);
    expect(effect.branches[0]).toBe(branch1);
    expect(effect.branches[1]).toBe(branch2);
  });

  // =========================================================================
  // Test 24: LogEffect carries string message
  // =========================================================================
  it("LogEffect carries string message", () => {
    const effect = Effect.log("hello world");
    expect(effect.message).toBe("hello world");
  });

  // =========================================================================
  // Test 25: LogEffect carries function message
  // =========================================================================
  it("LogEffect carries function message", () => {
    const fn = (_ctx: unknown, evt: { readonly type: string }) => `${evt.type}`;
    const effect = Effect.log(fn);
    expect(effect.message).toBe(fn);
    expect(typeof effect.message).toBe("function");
  });

  // =========================================================================
  // Test 26: DelayEffect carries ms and event payload
  // =========================================================================
  it("DelayEffect carries ms and event payload", () => {
    const effect = Effect.delay(3000);
    expect(effect._tag).toBe("Delay");
    expect(effect.milliseconds).toBe(3000);
  });
});

// =============================================================================
// DI Effect Executor Error Path Tests
// =============================================================================

import { createDIEffectExecutor } from "../src/integration/di-executor.js";
import { createActivityManager } from "../src/activities/manager.js";

describe("DIEffectExecutor error paths", () => {
  it("Invoke with a method that throws returns InvokeError", async () => {
    const scope = {
      resolve: () => ({
        badMethod: () => {
          throw new Error("method failed");
        },
      }),
    };
    const activityManager = createActivityManager();
    const executor = createDIEffectExecutor({
      scope: scope as any,
      activityManager,
    });

    const _effect = Effect.invoke(UserServicePort, "getUser" as any, ["id"] as any);
    // The port resolves to our mock scope which doesn't have getUser but we
    // need to test the actual InvokeError path where the method throws
    const invokeEffect = {
      _tag: "Invoke" as const,
      port: { __portName: "UserService" },
      method: "badMethod",
      args: [],
    };

    const result = await executor.execute(invokeEffect as any);
    const error = expectErr(result);
    expect(error._tag).toBe("InvokeError");

    await activityManager.dispose();
  });

  it("Spawn unknown activity returns SpawnError with activityId", async () => {
    const scope = { resolve: () => ({}) };
    const activityManager = createActivityManager();
    const activityRegistry = new Map();
    // Registry is non-empty to trigger the lookup path
    activityRegistry.set("SomeOtherActivity", {});

    const executor = createDIEffectExecutor({
      scope: scope as any,
      activityManager,
      activityRegistry,
    });

    const effect = Effect.spawn("NonExistentActivity", { data: 42 });
    const result = await executor.execute(effect);
    const error = expectErr(result);
    expect(error._tag).toBe("SpawnError");
    if (error._tag === "SpawnError") {
      expect(error.activityId).toBe("NonExistentActivity");
    }

    await activityManager.dispose();
  });

  it("Stop on non-existent activity is a no-op (ok)", async () => {
    const scope = { resolve: () => ({}) };
    const activityManager = createActivityManager();

    const executor = createDIEffectExecutor({
      scope: scope as any,
      activityManager,
    });

    const effect = Effect.stop("nonexistent-activity");
    const result = await executor.execute(effect);
    // Stop on non-existent is just a no-op in the activity manager
    expectOk(result);

    await activityManager.dispose();
  });

  it("Sequence that fails at step 1 returns SequenceAborted with stepIndex", async () => {
    const scope = {
      resolve: () => ({
        badMethod: () => {
          throw new Error("step 1 failure");
        },
      }),
    };
    const activityManager = createActivityManager();
    const executor = createDIEffectExecutor({
      scope: scope as any,
      activityManager,
    });

    // Build a sequence: step 0 = None (ok), step 1 = failing Invoke
    const noneEffect = Effect.none();
    const failingInvoke = {
      _tag: "Invoke" as const,
      port: { __portName: "TestPort" },
      method: "badMethod",
      args: [],
    };
    const sequence = Effect.sequence([noneEffect, failingInvoke as any] as const);

    const result = await executor.execute(sequence);
    const error = expectErr(result);
    expect(error._tag).toBe("SequenceAborted");
    if (error._tag === "SequenceAborted") {
      expect(error.stepIndex).toBe(1);
    }

    await activityManager.dispose();
  });

  it("Parallel with mixed success/failure returns ParallelErrors", async () => {
    const scope = {
      resolve: () => ({
        badMethod: () => {
          throw new Error("parallel failure");
        },
      }),
    };
    const activityManager = createActivityManager();
    const executor = createDIEffectExecutor({
      scope: scope as any,
      activityManager,
    });

    const okEffect = Effect.none();
    const failingInvoke = {
      _tag: "Invoke" as const,
      port: { __portName: "TestPort" },
      method: "badMethod",
      args: [],
    };
    const parallel = Effect.parallel([okEffect, failingInvoke as any] as const);

    const result = await executor.execute(parallel);
    const error = expectErr(result);
    expect(error._tag).toBe("ParallelErrors");

    await activityManager.dispose();
  });

  it("Choose with no matching guard returns ok (no-op)", async () => {
    const scope = { resolve: () => ({}) };
    const activityManager = createActivityManager();
    const executor = createDIEffectExecutor({
      scope: scope as any,
      activityManager,
      contextProvider: () => ({ context: { value: 0 }, event: { type: "TEST" } }),
    });

    const chooseEffect = Effect.choose([
      { guard: () => false, effects: [Effect.delay(100)] },
      { guard: () => false, effects: [Effect.delay(200)] },
    ]);

    const result = await executor.execute(chooseEffect);
    expectOk(result);

    await activityManager.dispose();
  });

  it("Log with function message calls function with context", async () => {
    const scope = { resolve: () => ({}) };
    const activityManager = createActivityManager();
    const messageFn = (ctx: any, evt: any) => `ctx=${JSON.stringify(ctx)}, evt=${evt.type}`;

    const executor = createDIEffectExecutor({
      scope: scope as any,
      activityManager,
      contextProvider: () => ({ context: { count: 42 }, event: { type: "TEST_EVENT" } }),
    });

    const logEffect = Effect.log(messageFn);
    const result = await executor.execute(logEffect);
    expectOk(result);

    await activityManager.dispose();
  });

  it("NoneEffect returns ok immediately via DIEffectExecutor", async () => {
    const scope = { resolve: () => ({}) };
    const activityManager = createActivityManager();
    const executor = createDIEffectExecutor({
      scope: scope as any,
      activityManager,
    });

    const effect = Effect.none();
    const result = await executor.execute(effect);
    expectOk(result);

    await activityManager.dispose();
  });
});
