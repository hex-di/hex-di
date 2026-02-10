/**
 * Runtime Tests for createMachineBuilder
 *
 * These tests verify that the builder DSL produces machines that behave
 * identically to those created with defineMachine(). Tests cover:
 * 1. Simple toggle machine
 * 2. Machine with guards and actions
 * 3. Machine with effects
 * 4. Compound states
 * 5. Multiple transitions for the same event (guarded)
 * 6. Machine without context (undefined)
 * 7. Behavioral equivalence with defineMachine
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { port } from "@hex-di/core";
import { createMachineBuilder } from "../src/machine/builder.js";
import { defineMachine } from "../src/machine/define-machine.js";
import { Effect } from "../src/effects/constructors.js";
import { transition } from "../src/runner/interpreter.js";
import { createMachineRunner, createBasicExecutor } from "../src/runner/index.js";
import { createActivityManager } from "../src/activities/index.js";

// =============================================================================
// Test 1: Simple Toggle Machine
// =============================================================================

describe("createMachineBuilder", () => {
  describe("simple toggle machine", () => {
    it("should create a machine with two states and toggle transitions", () => {
      const machine = createMachineBuilder({ id: "toggle", context: undefined })
        .addState("off")
        .addState("on")
        .transitions()
        .on("off", "TOGGLE", "on")
        .on("on", "TOGGLE", "off")
        .build();

      expect(machine.id).toBe("toggle");
      expect(machine.initial).toBe("off");
      expect(Object.keys(machine.states)).toEqual(["off", "on"]);
    });

    it("should use the first added state as initial", () => {
      const machine = createMachineBuilder({ id: "test", context: undefined })
        .addState("loading")
        .addState("done")
        .transitions()
        .build();

      expect(machine.initial).toBe("loading");
    });

    it("should produce a machine usable with transition()", () => {
      const machine = createMachineBuilder({ id: "toggle", context: undefined })
        .addState("off")
        .addState("on")
        .transitions()
        .on("off", "TOGGLE", "on")
        .on("on", "TOGGLE", "off")
        .build();

      const result1 = transition("off", undefined, { type: "TOGGLE" }, machine);
      expect(result1.transitioned).toBe(true);
      expect(result1.newState).toBe("on");

      const result2 = transition("on", undefined, { type: "TOGGLE" }, machine);
      expect(result2.transitioned).toBe(true);
      expect(result2.newState).toBe("off");
    });

    it("should return transitioned=false for unhandled events", () => {
      const machine = createMachineBuilder({ id: "toggle", context: undefined })
        .addState("off")
        .addState("on")
        .transitions()
        .on("off", "TOGGLE", "on")
        .build();

      // "on" state has no transitions defined
      const result = transition("on", undefined, { type: "TOGGLE" }, machine);
      expect(result.transitioned).toBe(false);
    });
  });

  // ===========================================================================
  // Test 2: Machine with Guards and Actions
  // ===========================================================================

  describe("machine with guards and actions", () => {
    it("should support guards on transitions", () => {
      const machine = createMachineBuilder({
        id: "counter",
        context: { count: 0 },
      })
        .addState("active")
        .addState("maxed")
        .transitions()
        .on("active", "INCREMENT", "active", {
          guard: ctx => ctx.count < 3,
          actions: [ctx => ({ count: ctx.count + 1 })],
        })
        .on("active", "INCREMENT", "maxed", {
          guard: ctx => ctx.count >= 3,
        })
        .build();

      // At count=0, guard allows increment
      const result1 = transition("active", { count: 0 }, { type: "INCREMENT" }, machine);
      expect(result1.transitioned).toBe(true);
      expect(result1.newState).toBe("active");

      // At count=3, should transition to maxed
      const result2 = transition("active", { count: 3 }, { type: "INCREMENT" }, machine);
      expect(result2.transitioned).toBe(true);
      expect(result2.newState).toBe("maxed");
    });

    it("should apply actions to update context", () => {
      const machine = createMachineBuilder({
        id: "counter",
        context: { count: 0 },
      })
        .addState("active")
        .transitions()
        .on("active", "INCREMENT", "active", {
          actions: [ctx => ({ count: ctx.count + 1 })],
        })
        .build();

      const result = transition("active", { count: 5 }, { type: "INCREMENT" }, machine);
      expect(result.transitioned).toBe(true);
      expect(result.newState).toBe("active");
      expect(result.newContext).toEqual({ count: 6 });
    });
  });

  // ===========================================================================
  // Test 3: Machine with Effects
  // ===========================================================================

  describe("machine with effects", () => {
    it("should include effects in transitions", () => {
      const LoggerPort = port<{ log(msg: string): void }>()({ name: "Logger" });

      const machine = createMachineBuilder({ id: "effectful", context: undefined })
        .addState("idle")
        .addState("active")
        .transitions()
        .on("idle", "START", "active", {
          effects: [Effect.invoke(LoggerPort, "log", ["Starting"])],
        })
        .build();

      const result = transition("idle", undefined, { type: "START" }, machine);
      expect(result.transitioned).toBe(true);
      expect(result.newState).toBe("active");
      expect(result.effects.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // Test 4: Compound States
  // ===========================================================================

  describe("compound states", () => {
    it("should support compound state configuration via addState config", () => {
      const machine = createMachineBuilder({ id: "compound", context: undefined })
        .addState("idle")
        .addState("active", {
          type: "compound",
          initial: "running",
          states: {
            running: { on: {} },
            paused: { on: {} },
          },
        })
        .transitions()
        .on("idle", "START", "active")
        .build();

      expect(machine.id).toBe("compound");
      expect(machine.initial).toBe("idle");

      // The active state should have nested states
      const activeState = machine.states["active"];
      expect(activeState).toBeDefined();
      // Access properties via Object.getOwnPropertyDescriptor to avoid type narrowing issues
      expect(Object.getOwnPropertyDescriptor(activeState, "type")?.value).toBe("compound");
      expect(Object.getOwnPropertyDescriptor(activeState, "initial")?.value).toBe("running");
      expect(Object.getOwnPropertyDescriptor(activeState, "states")?.value).toBeDefined();
    });
  });

  // ===========================================================================
  // Test 5: Machine Without Context
  // ===========================================================================

  describe("machine without context", () => {
    it("should handle undefined context", () => {
      const machine = createMachineBuilder({ id: "nocontext", context: undefined })
        .addState("a")
        .addState("b")
        .transitions()
        .on("a", "GO", "b")
        .build();

      expect(machine.id).toBe("nocontext");
      expect(machine.context).toBeUndefined();
    });
  });

  // ===========================================================================
  // Test 6: Entry/Exit Effects via addState
  // ===========================================================================

  describe("entry and exit effects", () => {
    it("should pass entry/exit effects through to the machine", () => {
      const LoggerPort = port<{ log(msg: string): void }>()({ name: "Logger" });

      const machine = createMachineBuilder({ id: "lifecycle", context: undefined })
        .addState("idle")
        .addState("active", {
          entry: [Effect.invoke(LoggerPort, "log", ["Entering active"])],
          exit: [Effect.invoke(LoggerPort, "log", ["Exiting active"])],
        })
        .transitions()
        .on("idle", "GO", "active")
        .on("active", "STOP", "idle")
        .build();

      const activeState = machine.states["active"];
      expect(Object.getOwnPropertyDescriptor(activeState, "entry")?.value).toHaveLength(1);
      expect(Object.getOwnPropertyDescriptor(activeState, "exit")?.value).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Test 7: Behavioral Equivalence with defineMachine
  // ===========================================================================

  describe("behavioral equivalence with defineMachine", () => {
    it("should produce identical transition behavior as defineMachine", () => {
      // Create machine via builder
      const builderMachine = createMachineBuilder({
        id: "fetcher",
        context: { data: null as string | null, loading: false },
      })
        .addState("idle")
        .addState("loading")
        .addState("success")
        .transitions()
        .on("idle", "FETCH", "loading", {
          actions: [ctx => ({ ...ctx, loading: true })],
        })
        .on("loading", "SUCCESS", "success", {
          actions: [ctx => ({ ...ctx, loading: false, data: "result" })],
        })
        .on("success", "RESET", "idle", {
          actions: [_ctx => ({ data: null, loading: false })],
        })
        .build();

      // Create equivalent machine via defineMachine
      const configMachine = defineMachine({
        id: "fetcher",
        initial: "idle",
        context: { data: null as string | null, loading: false },
        states: {
          idle: {
            on: {
              FETCH: {
                target: "loading",
                actions: [
                  (ctx: { data: string | null; loading: boolean }) => ({ ...ctx, loading: true }),
                ],
              },
            },
          },
          loading: {
            on: {
              SUCCESS: {
                target: "success",
                actions: [
                  (ctx: { data: string | null; loading: boolean }) => ({
                    ...ctx,
                    loading: false,
                    data: "result",
                  }),
                ],
              },
            },
          },
          success: {
            on: {
              RESET: {
                target: "idle",
                actions: [
                  (_ctx: { data: string | null; loading: boolean }) => ({
                    data: null,
                    loading: false,
                  }),
                ],
              },
            },
          },
        },
      });

      const ctx = { data: null, loading: false };

      // Compare transitions
      const b1 = transition("idle", ctx, { type: "FETCH" }, builderMachine);
      const c1 = transition("idle", ctx, { type: "FETCH" }, configMachine);
      expect(b1.newState).toBe(c1.newState);
      expect(b1.newContext).toEqual(c1.newContext);

      const b2 = transition(
        "loading",
        { ...ctx, loading: true },
        { type: "SUCCESS" },
        builderMachine
      );
      const c2 = transition(
        "loading",
        { ...ctx, loading: true },
        { type: "SUCCESS" },
        configMachine
      );
      expect(b2.newState).toBe(c2.newState);
      expect(b2.newContext).toEqual(c2.newContext);

      const b3 = transition(
        "success",
        { data: "result", loading: false },
        { type: "RESET" },
        builderMachine
      );
      const c3 = transition(
        "success",
        { data: "result", loading: false },
        { type: "RESET" },
        configMachine
      );
      expect(b3.newState).toBe(c3.newState);
      expect(b3.newContext).toEqual(c3.newContext);
    });
  });

  // ===========================================================================
  // Test 8: Runner Integration
  // ===========================================================================

  describe("runner integration", () => {
    it("should work with createMachineRunner", () => {
      const machine = createMachineBuilder({ id: "runner-test", context: { value: 0 } })
        .addState("idle")
        .addState("active")
        .transitions()
        .on("idle", "GO", "active", {
          actions: [ctx => ({ value: ctx.value + 1 })],
        })
        .on("active", "STOP", "idle")
        .build();

      const executor = createBasicExecutor();
      const activityManager = createActivityManager();
      const runner = createMachineRunner(machine, { executor, activityManager });

      expect(runner.snapshot().state).toBe("idle");

      runner.send({ type: "GO" });
      expect(runner.snapshot().state).toBe("active");
      expect(runner.snapshot().context).toEqual({ value: 1 });

      runner.send({ type: "STOP" });
      expect(runner.snapshot().state).toBe("idle");

      runner.dispose();
    });
  });

  // ===========================================================================
  // Test 9: Internal Transitions
  // ===========================================================================

  describe("internal transitions", () => {
    it("should support internal flag on transitions", () => {
      const machine = createMachineBuilder({ id: "internal", context: { count: 0 } })
        .addState("active")
        .transitions()
        .on("active", "INCREMENT", "active", {
          internal: true,
          actions: [ctx => ({ count: ctx.count + 1 })],
        })
        .build();

      const result = transition("active", { count: 0 }, { type: "INCREMENT" }, machine);
      expect(result.transitioned).toBe(true);
      expect(result.newState).toBe("active");
      expect(result.newContext).toEqual({ count: 1 });
    });
  });

  // ===========================================================================
  // Test 10: Machine is Frozen (Immutable)
  // ===========================================================================

  describe("immutability", () => {
    it("should produce a frozen machine", () => {
      const machine = createMachineBuilder({ id: "frozen", context: undefined })
        .addState("a")
        .addState("b")
        .transitions()
        .on("a", "GO", "b")
        .build();

      expect(Object.isFrozen(machine)).toBe(true);
    });
  });
});
