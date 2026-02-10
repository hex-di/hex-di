/**
 * DIEffectExecutor health event emission tests
 *
 * Tests that the DIEffectExecutor emits HealthEvent signals
 * when effect execution encounters errors.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { port } from "@hex-di/core";
import { expectOk, expectErr } from "@hex-di/result-testing";
import { createDIEffectExecutor } from "../../src/integration/di-executor.js";
import { createActivityManager } from "../../src/activities/manager.js";
import { Effect } from "../../src/effects/constructors.js";
import type { HealthEvent } from "../../src/introspection/types.js";
import type { ScopeResolver } from "../../src/integration/di-executor.js";

// =============================================================================
// Fixtures
// =============================================================================

interface FaultyService {
  explode(): Promise<void>;
}

const FaultyPort = port<FaultyService>()({ name: "Faulty" });

function createFailingScopeResolver(): ScopeResolver {
  return {
    resolve() {
      throw new Error("resolution failure");
    },
  };
}

function createThrowingServiceResolver(): ScopeResolver {
  return {
    resolve(_port: any): any {
      return {
        explode() {
          return Promise.reject(new Error("service threw"));
        },
      };
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("DIEffectExecutor health events", () => {
  it("onHealthEvent fires on InvokeError", async () => {
    const healthEvents: HealthEvent[] = [];

    const executor = createDIEffectExecutor({
      scope: createFailingScopeResolver(),
      activityManager: createActivityManager(),
      onHealthEvent: event => healthEvents.push(event),
      machineId: "test-machine",
    });

    const invokeEffect = Effect.invoke(FaultyPort, "explode", []);
    const result = await executor.execute(invokeEffect);

    expectErr(result);
    expect(healthEvents).toHaveLength(1);
    expect(healthEvents[0]?.type).toBe("flow-error");
    if (healthEvents[0]?.type === "flow-error") {
      expect(healthEvents[0].machineId).toBe("test-machine");
      expect(healthEvents[0].state).toBe("invoke-effect");
    }
  });

  it("onHealthEvent fires on SpawnError", async () => {
    const healthEvents: HealthEvent[] = [];

    // Create an activity registry with a bogus entry to force a spawn error
    const activityRegistry = new Map();
    activityRegistry.set("BogusActivity", {
      port: { __portName: "BogusActivity" },
      requires: [],
      emits: {},
      timeout: undefined,
      execute: () => {
        throw new Error("spawn failure");
      },
    });

    const executor = createDIEffectExecutor({
      scope: createThrowingServiceResolver(),
      activityManager: createActivityManager(),
      activityRegistry,
      onHealthEvent: event => healthEvents.push(event),
      machineId: "spawn-machine",
    });

    const spawnEffect = Effect.spawn("BogusActivity", {});
    const result = await executor.execute(spawnEffect);

    expectErr(result);
    expect(healthEvents).toHaveLength(1);
    expect(healthEvents[0]?.type).toBe("flow-error");
    if (healthEvents[0]?.type === "flow-error") {
      expect(healthEvents[0].machineId).toBe("spawn-machine");
      expect(healthEvents[0].state).toBe("spawn-effect");
    }
  });

  it("health event contains correct machineId and timestamp", async () => {
    const healthEvents: HealthEvent[] = [];
    const before = Date.now();

    const executor = createDIEffectExecutor({
      scope: createFailingScopeResolver(),
      activityManager: createActivityManager(),
      onHealthEvent: event => healthEvents.push(event),
      machineId: "timestamp-machine",
    });

    const invokeEffect = Effect.invoke(FaultyPort, "explode", []);
    await executor.execute(invokeEffect);

    const after = Date.now();

    expect(healthEvents).toHaveLength(1);
    if (healthEvents[0]?.type === "flow-error") {
      expect(healthEvents[0].machineId).toBe("timestamp-machine");
      expect(healthEvents[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(healthEvents[0].timestamp).toBeLessThanOrEqual(after);
    }
  });

  it("no health event when execution succeeds", async () => {
    const healthEvents: HealthEvent[] = [];

    const executor = createDIEffectExecutor({
      scope: createThrowingServiceResolver(),
      activityManager: createActivityManager(),
      onHealthEvent: event => healthEvents.push(event),
      machineId: "ok-machine",
    });

    // None effect always succeeds
    const noneEffect = Effect.none();
    const result = await executor.execute(noneEffect);

    expectOk(result);
    expect(healthEvents).toHaveLength(0);
  });

  it("no health event when onHealthEvent not configured", async () => {
    // Should not throw even when onHealthEvent is missing
    const executor = createDIEffectExecutor({
      scope: createFailingScopeResolver(),
      activityManager: createActivityManager(),
    });

    const invokeEffect = Effect.invoke(FaultyPort, "explode", []);
    const result = await executor.execute(invokeEffect);

    // Should still produce an error result, just no health event emission
    expectErr(result);
  });

  it("no health event when machineId not configured", async () => {
    const healthEvents: HealthEvent[] = [];

    const executor = createDIEffectExecutor({
      scope: createFailingScopeResolver(),
      activityManager: createActivityManager(),
      onHealthEvent: event => healthEvents.push(event),
      // machineId intentionally omitted
    });

    const invokeEffect = Effect.invoke(FaultyPort, "explode", []);
    await executor.execute(invokeEffect);

    // Health event should NOT fire because machineId is not set
    expect(healthEvents).toHaveLength(0);
  });

  it("emits flow-degraded after 3 consecutive failures", async () => {
    const healthEvents: HealthEvent[] = [];
    const executor = createDIEffectExecutor({
      scope: createFailingScopeResolver(),
      activityManager: createActivityManager(),
      onHealthEvent: event => healthEvents.push(event),
      machineId: "degraded-machine",
    });

    const invokeEffect = Effect.invoke(FaultyPort, "explode", []);

    // Fire 3 consecutive failures
    await executor.execute(invokeEffect);
    await executor.execute(invokeEffect);
    await executor.execute(invokeEffect);

    // Should have 3 flow-error events + 1 flow-degraded
    const errorEvents = healthEvents.filter(e => e.type === "flow-error");
    const degradedEvents = healthEvents.filter(e => e.type === "flow-degraded");
    expect(errorEvents).toHaveLength(3);
    expect(degradedEvents).toHaveLength(1);
    if (degradedEvents[0]?.type === "flow-degraded") {
      expect(degradedEvents[0].failureCount).toBe(3);
      expect(degradedEvents[0].machineId).toBe("degraded-machine");
    }
  });

  it("emits flow-recovered when success follows failures", async () => {
    const healthEvents: HealthEvent[] = [];
    const executor = createDIEffectExecutor({
      scope: createFailingScopeResolver(),
      activityManager: createActivityManager(),
      onHealthEvent: event => healthEvents.push(event),
      machineId: "recovery-machine",
    });

    const invokeEffect = Effect.invoke(FaultyPort, "explode", []);

    // Fail twice
    await executor.execute(invokeEffect);
    await executor.execute(invokeEffect);

    // Succeed (None effect)
    const noneEffect = Effect.none();
    await executor.execute(noneEffect);

    const recoveredEvents = healthEvents.filter(e => e.type === "flow-recovered");
    expect(recoveredEvents).toHaveLength(1);
    if (recoveredEvents[0]?.type === "flow-recovered") {
      expect(recoveredEvents[0].machineId).toBe("recovery-machine");
    }
  });

  it("resets failure counter on success", async () => {
    const healthEvents: HealthEvent[] = [];
    const executor = createDIEffectExecutor({
      scope: createFailingScopeResolver(),
      activityManager: createActivityManager(),
      onHealthEvent: event => healthEvents.push(event),
      machineId: "reset-machine",
    });

    const invokeEffect = Effect.invoke(FaultyPort, "explode", []);
    const noneEffect = Effect.none();

    // Fail once, then succeed (resets counter)
    await executor.execute(invokeEffect);
    await executor.execute(noneEffect);

    // Fail 3 more times -- degraded should fire at the 3rd
    await executor.execute(invokeEffect);
    await executor.execute(invokeEffect);
    await executor.execute(invokeEffect);

    const degradedEvents = healthEvents.filter(e => e.type === "flow-degraded");
    expect(degradedEvents).toHaveLength(1);
    // The degraded event should have failureCount 3, not 4
    if (degradedEvents[0]?.type === "flow-degraded") {
      expect(degradedEvents[0].failureCount).toBe(3);
    }
  });
});
