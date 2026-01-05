/**
 * Tracing Module Tests
 *
 * These tests verify the flow tracing functionality:
 * - NoOpFlowCollector has zero overhead
 * - FlowMemoryCollector records transitions
 * - Configurable history limits
 * - Subscription receives transition events
 * - Circular buffer evicts oldest entries
 * - Filter support
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMachine } from "../src/machine/create-machine.js";
import { event } from "../src/machine/factories.js";
import { createBasicExecutor } from "../src/runner/executor.js";
import { createActivityManager } from "../src/activities/manager.js";
import {
  NoOpFlowCollector,
  noopFlowCollector,
  FlowMemoryCollector,
  createTracingRunner,
  createTracingRunnerWithDuration,
  __resetTransitionIdCounter,
  DEFAULT_FLOW_RETENTION_POLICY,
} from "../src/tracing/index.js";
import type { FlowTransitionEventAny } from "../src/tracing/index.js";

// =============================================================================
// Test Machine Setup
// =============================================================================

interface TestContext {
  readonly count: number;
}

const testMachine = createMachine({
  id: "test-machine",
  initial: "idle",
  context: { count: 0 } satisfies TestContext,
  states: {
    idle: {
      on: {
        START: {
          target: "active",
          actions: [(ctx: TestContext) => ({ ...ctx, count: ctx.count + 1 })],
        },
        INCREMENT: {
          target: "idle",
          actions: [(ctx: TestContext) => ({ ...ctx, count: ctx.count + 1 })],
        },
      },
    },
    active: {
      on: {
        STOP: {
          target: "idle",
        },
        PAUSE: {
          target: "paused",
        },
      },
    },
    paused: {
      on: {
        RESUME: {
          target: "active",
        },
      },
    },
  },
});

// Event helpers
const startEvent = event<"START">("START");
const stopEvent = event<"STOP">("STOP");
const pauseEvent = event<"PAUSE">("PAUSE");
const resumeEvent = event<"RESUME">("RESUME");

// =============================================================================
// NoOpFlowCollector Tests
// =============================================================================

describe("NoOpFlowCollector", () => {
  it("should have zero overhead - collect does nothing", () => {
    const collector = new NoOpFlowCollector();

    // Should not throw and do nothing
    collector.collect({
      id: "test-1",
      machineId: "test",
      prevState: "idle",
      event: { type: "START" },
      nextState: "active",
      effects: [],
      timestamp: Date.now(),
      duration: 10,
      isPinned: false,
    });

    // Transitions should still be empty
    expect(collector.getTransitions()).toHaveLength(0);
  });

  it("should return singleton empty array for getTransitions", () => {
    const collector = new NoOpFlowCollector();

    const result1 = collector.getTransitions();
    const result2 = collector.getTransitions({ machineId: "test" });

    // Should return same singleton array
    expect(result1).toBe(result2);
    expect(result1).toHaveLength(0);
    expect(Object.isFrozen(result1)).toBe(true);
  });

  it("should return singleton empty stats for getStats", () => {
    const collector = new NoOpFlowCollector();

    const stats = collector.getStats();

    expect(stats.totalTransitions).toBe(0);
    expect(stats.averageDuration).toBe(0);
    expect(stats.slowCount).toBe(0);
    expect(stats.sessionStart).toBe(0);
    expect(stats.totalDuration).toBe(0);
    expect(Object.isFrozen(stats)).toBe(true);
  });

  it("should return no-op unsubscribe function", () => {
    const collector = new NoOpFlowCollector();
    const callback = vi.fn();

    const unsubscribe = collector.subscribe(callback);

    // Unsubscribe should be callable
    unsubscribe();

    // Callback should never be called
    collector.collect({
      id: "test-1",
      machineId: "test",
      prevState: "idle",
      event: { type: "START" },
      nextState: "active",
      effects: [],
      timestamp: Date.now(),
      duration: 10,
      isPinned: false,
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("should have singleton instance available", () => {
    expect(noopFlowCollector).toBeInstanceOf(NoOpFlowCollector);
    expect(noopFlowCollector.getTransitions()).toHaveLength(0);
  });
});

// =============================================================================
// FlowMemoryCollector Tests
// =============================================================================

describe("FlowMemoryCollector", () => {
  beforeEach(() => {
    __resetTransitionIdCounter();
  });

  describe("Basic Collection", () => {
    it("should record transitions", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "test-machine",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      const transitions = collector.getTransitions();
      expect(transitions).toHaveLength(1);
      expect(transitions[0]?.machineId).toBe("test-machine");
      expect(transitions[0]?.prevState).toBe("idle");
      expect(transitions[0]?.nextState).toBe("active");
    });

    it("should record multiple transitions in order", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "machine-1",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: 1000,
        duration: 5,
        isPinned: false,
      });

      collector.collect({
        id: "test-2",
        machineId: "machine-2",
        prevState: "idle",
        event: { type: "GO" },
        nextState: "running",
        effects: [],
        timestamp: 2000,
        duration: 10,
        isPinned: false,
      });

      const transitions = collector.getTransitions();
      expect(transitions).toHaveLength(2);
      expect(transitions[0]?.id).toBe("test-1");
      expect(transitions[1]?.id).toBe("test-2");
    });
  });

  describe("Filtering", () => {
    it("should filter by machineId", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "machine-a",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      collector.collect({
        id: "test-2",
        machineId: "machine-b",
        prevState: "idle",
        event: { type: "GO" },
        nextState: "running",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      const filtered = collector.getTransitions({ machineId: "machine-a" });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.machineId).toBe("machine-a");
    });

    it("should filter by prevState", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      collector.collect({
        id: "test-2",
        machineId: "test",
        prevState: "active",
        event: { type: "STOP" },
        nextState: "idle",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      const filtered = collector.getTransitions({ prevState: "active" });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.prevState).toBe("active");
    });

    it("should filter by nextState", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      collector.collect({
        id: "test-2",
        machineId: "test",
        prevState: "active",
        event: { type: "STOP" },
        nextState: "idle",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      const filtered = collector.getTransitions({ nextState: "idle" });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.nextState).toBe("idle");
    });

    it("should filter by eventType", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      collector.collect({
        id: "test-2",
        machineId: "test",
        prevState: "active",
        event: { type: "STOP" },
        nextState: "idle",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      const filtered = collector.getTransitions({ eventType: "START" });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.event.type).toBe("START");
    });

    it("should filter by duration range", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "FAST" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      collector.collect({
        id: "test-2",
        machineId: "test",
        prevState: "active",
        event: { type: "SLOW" },
        nextState: "idle",
        effects: [],
        timestamp: Date.now(),
        duration: 150,
        isPinned: false,
      });

      // Filter by min duration
      const slow = collector.getTransitions({ minDuration: 100 });
      expect(slow).toHaveLength(1);
      expect(slow[0]?.duration).toBe(150);

      // Filter by max duration
      const fast = collector.getTransitions({ maxDuration: 10 });
      expect(fast).toHaveLength(1);
      expect(fast[0]?.duration).toBe(5);

      // Filter by range
      const medium = collector.getTransitions({ minDuration: 1, maxDuration: 50 });
      expect(medium).toHaveLength(1);
    });

    it("should combine multiple filter criteria (AND)", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "machine-a",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      collector.collect({
        id: "test-2",
        machineId: "machine-a",
        prevState: "active",
        event: { type: "STOP" },
        nextState: "idle",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      collector.collect({
        id: "test-3",
        machineId: "machine-b",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      const filtered = collector.getTransitions({
        machineId: "machine-a",
        eventType: "START",
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe("test-1");
    });
  });

  describe("Statistics", () => {
    it("should compute correct statistics", () => {
      const collector = new FlowMemoryCollector({ slowThresholdMs: 100 });

      collector.collect({
        id: "test-1",
        machineId: "machine-a",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 10,
        isPinned: false,
      });

      collector.collect({
        id: "test-2",
        machineId: "machine-a",
        prevState: "active",
        event: { type: "STOP" },
        nextState: "idle",
        effects: [],
        timestamp: Date.now(),
        duration: 20,
        isPinned: false,
      });

      collector.collect({
        id: "test-3",
        machineId: "machine-b",
        prevState: "idle",
        event: { type: "GO" },
        nextState: "running",
        effects: [],
        timestamp: Date.now(),
        duration: 150, // Slow
        isPinned: false,
      });

      const stats = collector.getStats();

      expect(stats.totalTransitions).toBe(3);
      expect(stats.totalDuration).toBe(180);
      expect(stats.averageDuration).toBe(60);
      expect(stats.slowCount).toBe(1); // Only the 150ms one
      expect(stats.transitionsByMachine["machine-a"]).toBe(2);
      expect(stats.transitionsByMachine["machine-b"]).toBe(1);
    });

    it("should return empty stats when no transitions", () => {
      const collector = new FlowMemoryCollector();

      const stats = collector.getStats();

      expect(stats.totalTransitions).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.slowCount).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.transitionsByMachine).toEqual({});
    });
  });

  describe("Subscription", () => {
    it("should notify subscribers on new transitions", () => {
      const collector = new FlowMemoryCollector();
      const callback = vi.fn();

      collector.subscribe(callback);

      const transitionEvent: FlowTransitionEventAny = {
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      };

      collector.collect(transitionEvent);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(transitionEvent);
    });

    it("should support multiple subscribers", () => {
      const collector = new FlowMemoryCollector();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      collector.subscribe(callback1);
      collector.subscribe(callback2);

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should stop notifying after unsubscribe", () => {
      const collector = new FlowMemoryCollector();
      const callback = vi.fn();

      const unsubscribe = collector.subscribe(callback);

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      collector.collect({
        id: "test-2",
        machineId: "test",
        prevState: "active",
        event: { type: "STOP" },
        nextState: "idle",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      // Still only 1 call
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("History Limits (FIFO Eviction)", () => {
    it("should respect maxTransitions limit", () => {
      const collector = new FlowMemoryCollector({ maxTransitions: 3 });

      for (let i = 1; i <= 5; i++) {
        collector.collect({
          id: `test-${i}`,
          machineId: "test",
          prevState: "idle",
          event: { type: "EVENT" },
          nextState: "active",
          effects: [],
          timestamp: Date.now(),
          duration: 5,
          isPinned: false,
        });
      }

      const transitions = collector.getTransitions();
      expect(transitions).toHaveLength(3);

      // Should keep the newest 3 (FIFO evicts oldest first)
      expect(transitions[0]?.id).toBe("test-3");
      expect(transitions[1]?.id).toBe("test-4");
      expect(transitions[2]?.id).toBe("test-5");
    });

    it("should evict oldest non-pinned first", () => {
      const collector = new FlowMemoryCollector({ maxTransitions: 3 });

      // Add a pinned transition
      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "IMPORTANT" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: true,
      });

      // Add non-pinned transitions
      for (let i = 2; i <= 5; i++) {
        collector.collect({
          id: `test-${i}`,
          machineId: "test",
          prevState: "idle",
          event: { type: "NORMAL" },
          nextState: "active",
          effects: [],
          timestamp: Date.now(),
          duration: 5,
          isPinned: false,
        });
      }

      const transitions = collector.getTransitions();
      expect(transitions).toHaveLength(3);

      // Pinned transition should still be there
      const pinned = transitions.find(t => t.id === "test-1");
      expect(pinned).toBeDefined();
      expect(pinned?.isPinned).toBe(true);
    });
  });

  describe("Auto-Pinning", () => {
    it("should auto-pin slow transitions", () => {
      const collector = new FlowMemoryCollector({ slowThresholdMs: 100 });

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "SLOW" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 150, // Above threshold
        isPinned: false,
      });

      const transitions = collector.getTransitions();
      expect(transitions[0]?.isPinned).toBe(true);
    });

    it("should not auto-pin fast transitions", () => {
      const collector = new FlowMemoryCollector({ slowThresholdMs: 100 });

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "FAST" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5, // Below threshold
        isPinned: false,
      });

      const transitions = collector.getTransitions();
      expect(transitions[0]?.isPinned).toBe(false);
    });
  });

  describe("Manual Pinning", () => {
    it("should allow manual pinning", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      collector.pin("test-1");

      const transitions = collector.getTransitions();
      expect(transitions[0]?.isPinned).toBe(true);
    });

    it("should allow manual unpinning", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: true,
      });

      collector.unpin("test-1");

      const transitions = collector.getTransitions();
      expect(transitions[0]?.isPinned).toBe(false);
    });
  });

  describe("Clear", () => {
    it("should clear all transitions", () => {
      const collector = new FlowMemoryCollector();

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      expect(collector.getTransitions()).toHaveLength(1);

      collector.clear();

      expect(collector.getTransitions()).toHaveLength(0);
    });

    it("should not affect subscriptions after clear", () => {
      const collector = new FlowMemoryCollector();
      const callback = vi.fn();

      collector.subscribe(callback);
      collector.clear();

      collector.collect({
        id: "test-1",
        machineId: "test",
        prevState: "idle",
        event: { type: "START" },
        nextState: "active",
        effects: [],
        timestamp: Date.now(),
        duration: 5,
        isPinned: false,
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("Default Retention Policy", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_FLOW_RETENTION_POLICY.maxTransitions).toBe(1000);
      expect(DEFAULT_FLOW_RETENTION_POLICY.maxPinnedTransitions).toBe(100);
      expect(DEFAULT_FLOW_RETENTION_POLICY.slowThresholdMs).toBe(100);
      expect(DEFAULT_FLOW_RETENTION_POLICY.expiryMs).toBe(300000);
    });

    it("should use defaults when no policy provided", () => {
      const collector = new FlowMemoryCollector();
      const policy = collector.getRetentionPolicy();

      expect(policy.maxTransitions).toBe(1000);
      expect(policy.maxPinnedTransitions).toBe(100);
      expect(policy.slowThresholdMs).toBe(100);
      expect(policy.expiryMs).toBe(300000);
    });

    it("should allow partial policy override", () => {
      const collector = new FlowMemoryCollector({ maxTransitions: 500 });
      const policy = collector.getRetentionPolicy();

      expect(policy.maxTransitions).toBe(500);
      expect(policy.maxPinnedTransitions).toBe(100); // Default
      expect(policy.slowThresholdMs).toBe(100); // Default
    });
  });
});

// =============================================================================
// Tracing Runner Integration Tests
// =============================================================================

describe("Tracing Runner Integration", () => {
  beforeEach(() => {
    __resetTransitionIdCounter();
  });

  it("should record transitions via collector", () => {
    const collector = new FlowMemoryCollector();
    const activityManager = createActivityManager();
    const executor = createBasicExecutor();

    const runner = createTracingRunner(testMachine, {
      executor,
      activityManager,
      collector,
    });

    runner.send(startEvent());

    const transitions = collector.getTransitions();
    expect(transitions).toHaveLength(1);
    expect(transitions[0]?.machineId).toBe("test-machine");
    expect(transitions[0]?.prevState).toBe("idle");
    expect(transitions[0]?.nextState).toBe("active");

    void runner.dispose();
  });

  it("should record multiple transitions in sequence", () => {
    const collector = new FlowMemoryCollector();
    const activityManager = createActivityManager();
    const executor = createBasicExecutor();

    const runner = createTracingRunner(testMachine, {
      executor,
      activityManager,
      collector,
    });

    runner.send(startEvent());
    runner.send(pauseEvent());
    runner.send(resumeEvent());
    runner.send(stopEvent());

    const transitions = collector.getTransitions();
    expect(transitions).toHaveLength(4);

    expect(transitions[0]?.prevState).toBe("idle");
    expect(transitions[0]?.nextState).toBe("active");

    expect(transitions[1]?.prevState).toBe("active");
    expect(transitions[1]?.nextState).toBe("paused");

    expect(transitions[2]?.prevState).toBe("paused");
    expect(transitions[2]?.nextState).toBe("active");

    expect(transitions[3]?.prevState).toBe("active");
    expect(transitions[3]?.nextState).toBe("idle");

    void runner.dispose();
  });

  it("should work without collector (uses noopFlowCollector)", () => {
    const activityManager = createActivityManager();
    const executor = createBasicExecutor();

    const runner = createTracingRunner(testMachine, {
      executor,
      activityManager,
      // No collector provided
    });

    // Should work without throwing
    runner.send(startEvent());
    expect(runner.state()).toBe("active");

    void runner.dispose();
  });

  it("should track duration with createTracingRunnerWithDuration", () => {
    const collector = new FlowMemoryCollector();
    const activityManager = createActivityManager();
    const executor = createBasicExecutor();

    const runner = createTracingRunnerWithDuration(testMachine, {
      executor,
      activityManager,
      collector,
    });

    runner.send(startEvent());

    const transitions = collector.getTransitions();
    expect(transitions).toHaveLength(1);
    expect(transitions[0]?.duration).toBeGreaterThanOrEqual(0);

    void runner.dispose();
  });

  it("should allow subscribing to transitions in real-time", () => {
    const collector = new FlowMemoryCollector();
    const activityManager = createActivityManager();
    const executor = createBasicExecutor();
    const callback = vi.fn();

    const runner = createTracingRunner(testMachine, {
      executor,
      activityManager,
      collector,
    });

    collector.subscribe(callback);

    runner.send(startEvent());

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0]?.nextState).toBe("active");

    void runner.dispose();
  });
});
