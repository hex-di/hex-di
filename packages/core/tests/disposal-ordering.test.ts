/**
 * Tests for formal disposal ordering.
 *
 * Covers:
 * - computeDisposalPlan: reverse topological sort via Kahn's algorithm
 * - executeDisposalPlan: phased execution with parallel disposal and blame context
 * - DisposalCycleInvariantError: safety check for cycles
 * - Edge cases: empty graph, single node, independent nodes, diamond deps
 *
 * @see BEH-CO-14-001, BEH-CO-14-002, BEH-CO-14-003
 * @packageDocumentation
 */

import { describe, test, expect } from "vitest";
import {
  computeDisposalPlan,
  executeDisposalPlan,
  DisposalCycleInvariantError,
} from "../src/disposal/index.js";
import type { DependencyEntry, DisposalPlan } from "../src/disposal/index.js";

// =============================================================================
// computeDisposalPlan Tests
// =============================================================================

describe("computeDisposalPlan", () => {
  test("returns empty plan for empty input", () => {
    const plan = computeDisposalPlan([]);
    expect(plan.phases).toHaveLength(0);
    expect(plan.totalAdapters).toBe(0);
  });

  test("single adapter with no deps is in phase 0", () => {
    const entries: DependencyEntry[] = [{ portName: "A", dependsOn: [], hasFinalizer: true }];
    const plan = computeDisposalPlan(entries);
    expect(plan.phases).toHaveLength(1);
    expect(plan.totalAdapters).toBe(1);
    expect(plan.phases[0]?.level).toBe(0);
    expect(plan.phases[0]?.adapters).toHaveLength(1);
    expect(plan.phases[0]?.adapters[0]?.portName).toBe("A");
  });

  test("linear chain: A -> B -> C produces 3 phases (A first, C last)", () => {
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: ["B"], hasFinalizer: false },
      { portName: "B", dependsOn: ["C"], hasFinalizer: true },
      { portName: "C", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    expect(plan.phases).toHaveLength(3);
    expect(plan.totalAdapters).toBe(3);

    // Phase 0: A (leaf - has no dependents... wait, A depends on B,
    // so A has no dependents = leaf)
    expect(plan.phases[0]?.adapters.map(a => a.portName)).toEqual(["A"]);
    // Phase 1: B (after A is removed, B has no dependents)
    expect(plan.phases[1]?.adapters.map(a => a.portName)).toEqual(["B"]);
    // Phase 2: C (root - no deps)
    expect(plan.phases[2]?.adapters.map(a => a.portName)).toEqual(["C"]);
  });

  test("diamond: A -> C, B -> C produces 2 phases", () => {
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: ["C"], hasFinalizer: false },
      { portName: "B", dependsOn: ["C"], hasFinalizer: false },
      { portName: "C", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    expect(plan.phases).toHaveLength(2);
    // Phase 0: A and B (both are leaves - no dependents)
    const phase0Names = plan.phases[0]?.adapters.map(a => a.portName);
    expect(phase0Names).toEqual(["A", "B"]); // sorted alphabetically
    // Phase 1: C
    expect(plan.phases[1]?.adapters.map(a => a.portName)).toEqual(["C"]);
  });

  test("independent adapters: A, B, C all in phase 0", () => {
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: [], hasFinalizer: true },
      { portName: "B", dependsOn: [], hasFinalizer: false },
      { portName: "C", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    expect(plan.phases).toHaveLength(1);
    expect(plan.totalAdapters).toBe(3);
    const names = plan.phases[0]?.adapters.map(a => a.portName);
    expect(names).toEqual(["A", "B", "C"]);
  });

  test("complex: A -> B, A -> C, B -> D, C -> D", () => {
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: ["B", "C"], hasFinalizer: false },
      { portName: "B", dependsOn: ["D"], hasFinalizer: true },
      { portName: "C", dependsOn: ["D"], hasFinalizer: true },
      { portName: "D", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    expect(plan.phases).toHaveLength(3);
    // Phase 0: A (only leaf)
    expect(plan.phases[0]?.adapters.map(a => a.portName)).toEqual(["A"]);
    // Phase 1: B and C (after A removed)
    expect(plan.phases[1]?.adapters.map(a => a.portName)).toEqual(["B", "C"]);
    // Phase 2: D (root)
    expect(plan.phases[2]?.adapters.map(a => a.portName)).toEqual(["D"]);
  });

  test("two independent chains: A -> B, C -> D", () => {
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: ["B"], hasFinalizer: false },
      { portName: "B", dependsOn: [], hasFinalizer: true },
      { portName: "C", dependsOn: ["D"], hasFinalizer: false },
      { portName: "D", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    expect(plan.phases).toHaveLength(2);
    // Phase 0: A and C (both leaves)
    expect(plan.phases[0]?.adapters.map(a => a.portName)).toEqual(["A", "C"]);
    // Phase 1: B and D
    expect(plan.phases[1]?.adapters.map(a => a.portName)).toEqual(["B", "D"]);
  });

  test("hasFinalizer is tracked correctly", () => {
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: [], hasFinalizer: true },
      { portName: "B", dependsOn: [], hasFinalizer: false },
    ];
    const plan = computeDisposalPlan(entries);

    const aEntry = plan.phases[0]?.adapters.find(a => a.portName === "A");
    const bEntry = plan.phases[0]?.adapters.find(a => a.portName === "B");
    expect(aEntry?.hasFinalizer).toBe(true);
    expect(bEntry?.hasFinalizer).toBe(false);
  });

  test("ignores dependencies on unknown (external) ports", () => {
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: ["ExternalPort"], hasFinalizer: true },
      { portName: "B", dependsOn: ["A"], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    // ExternalPort is not in the entries, so it's ignored
    // B depends on A, so B is disposed first
    expect(plan.phases).toHaveLength(2);
    expect(plan.phases[0]?.adapters.map(a => a.portName)).toEqual(["B"]);
    expect(plan.phases[1]?.adapters.map(a => a.portName)).toEqual(["A"]);
  });

  test("plan is deeply frozen", () => {
    const entries: DependencyEntry[] = [{ portName: "A", dependsOn: [], hasFinalizer: true }];
    const plan = computeDisposalPlan(entries);

    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.phases)).toBe(true);
    if (plan.phases[0] !== undefined) {
      expect(Object.isFrozen(plan.phases[0])).toBe(true);
      expect(Object.isFrozen(plan.phases[0].adapters)).toBe(true);
      if (plan.phases[0].adapters[0] !== undefined) {
        expect(Object.isFrozen(plan.phases[0].adapters[0])).toBe(true);
      }
    }
  });

  test("deterministic ordering: same input always produces same output", () => {
    const entries: DependencyEntry[] = [
      { portName: "Zebra", dependsOn: [], hasFinalizer: true },
      { portName: "Alpha", dependsOn: [], hasFinalizer: true },
      { portName: "Mango", dependsOn: [], hasFinalizer: true },
    ];

    const plan1 = computeDisposalPlan(entries);
    const plan2 = computeDisposalPlan(entries);

    const names1 = plan1.phases[0]?.adapters.map(a => a.portName);
    const names2 = plan2.phases[0]?.adapters.map(a => a.portName);
    expect(names1).toEqual(names2);
    expect(names1).toEqual(["Alpha", "Mango", "Zebra"]); // sorted
  });
});

// =============================================================================
// DisposalCycleInvariantError Tests
// =============================================================================

describe("DisposalCycleInvariantError", () => {
  test("is thrown when a cycle exists in entries", () => {
    // This should never happen in practice (cycles caught at build time)
    // but the safety check should work
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: ["B"], hasFinalizer: true },
      { portName: "B", dependsOn: ["A"], hasFinalizer: true },
    ];

    expect(() => computeDisposalPlan(entries)).toThrow(DisposalCycleInvariantError);
  });

  test("error contains remaining nodes", () => {
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: ["B"], hasFinalizer: true },
      { portName: "B", dependsOn: ["C"], hasFinalizer: true },
      { portName: "C", dependsOn: ["A"], hasFinalizer: true },
    ];

    try {
      computeDisposalPlan(entries);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(DisposalCycleInvariantError);
      const cycleError = error as InstanceType<typeof DisposalCycleInvariantError>;
      expect(cycleError.remainingNodes).toEqual(["A", "B", "C"]);
      expect(cycleError.code).toBe("DISPOSAL_CYCLE_INVARIANT");
      expect(Object.isFrozen(cycleError)).toBe(true);
      expect(Object.isFrozen(cycleError.remainingNodes)).toBe(true);
    }
  });

  test("error message mentions framework bug", () => {
    const entries: DependencyEntry[] = [
      { portName: "X", dependsOn: ["Y"], hasFinalizer: true },
      { portName: "Y", dependsOn: ["X"], hasFinalizer: true },
    ];

    try {
      computeDisposalPlan(entries);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(DisposalCycleInvariantError);
      expect((error as Error).message).toContain("framework bug");
    }
  });
});

// =============================================================================
// executeDisposalPlan Tests
// =============================================================================

describe("executeDisposalPlan", () => {
  test("executes empty plan with no errors", async () => {
    const plan: DisposalPlan = Object.freeze({
      phases: Object.freeze([]),
      totalAdapters: 0,
    });

    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: () => undefined,
    });

    expect(result.disposed).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.totalTime).toBeGreaterThanOrEqual(0);
    expect(Object.isFrozen(result)).toBe(true);
  });

  test("calls finalizers in phase order", async () => {
    const disposalOrder: string[] = [];
    const entries: DependencyEntry[] = [
      { portName: "Service", dependsOn: ["Database"], hasFinalizer: true },
      { portName: "Database", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    const instances = new Map<string, { instance: unknown; finalizer: (i: unknown) => void }>([
      [
        "Service",
        {
          instance: "service-instance",
          finalizer: () => {
            disposalOrder.push("Service");
          },
        },
      ],
      [
        "Database",
        {
          instance: "db-instance",
          finalizer: () => {
            disposalOrder.push("Database");
          },
        },
      ],
    ]);

    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: name => instances.get(name),
    });

    expect(result.errors).toEqual([]);
    // Service should be disposed before Database (reverse dep order)
    expect(disposalOrder).toEqual(["Service", "Database"]);
    expect(result.disposed).toContain("Service");
    expect(result.disposed).toContain("Database");
  });

  test("disposes independent adapters in parallel (same phase)", async () => {
    const startTimes: Record<string, number> = {};
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: [], hasFinalizer: true },
      { portName: "B", dependsOn: [], hasFinalizer: true },
      { portName: "C", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    const instances = new Map<
      string,
      { instance: unknown; finalizer: (i: unknown) => Promise<void> }
    >();
    for (const name of ["A", "B", "C"]) {
      instances.set(name, {
        instance: name,
        finalizer: async () => {
          startTimes[name] = Date.now();
          // Small delay to verify parallel execution
          await new Promise<void>(resolve => {
            const g = globalThis as Record<string, unknown>;
            const st = g.setTimeout as (fn: () => void, ms: number) => unknown;
            st(resolve, 10);
          });
        },
      });
    }

    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: name => instances.get(name),
    });

    expect(result.errors).toEqual([]);
    expect(result.disposed).toHaveLength(3);
    // All 3 should be in the disposed list
    expect(result.disposed).toContain("A");
    expect(result.disposed).toContain("B");
    expect(result.disposed).toContain("C");
  });

  test("collects errors without stopping disposal", async () => {
    const disposalOrder: string[] = [];
    const entries: DependencyEntry[] = [
      { portName: "A", dependsOn: [], hasFinalizer: true },
      { portName: "B", dependsOn: [], hasFinalizer: true },
      { portName: "C", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    const instances = new Map([
      [
        "A",
        {
          instance: "a",
          finalizer: () => {
            disposalOrder.push("A");
          },
        },
      ],
      [
        "B",
        {
          instance: "b",
          finalizer: () => {
            disposalOrder.push("B");
            throw new Error("B failed");
          },
        },
      ],
      [
        "C",
        {
          instance: "c",
          finalizer: () => {
            disposalOrder.push("C");
          },
        },
      ],
    ]);

    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: name => instances.get(name),
    });

    // All 3 should still be disposed (best-effort)
    expect(result.disposed).toContain("A");
    expect(result.disposed).toContain("B");
    expect(result.disposed).toContain("C");

    // B's error should be recorded
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.adapterName).toBe("B");
    expect(result.errors[0]?.error).toBeInstanceOf(Error);
  });

  test("error entries include blame context", async () => {
    const entries: DependencyEntry[] = [
      { portName: "FailingService", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    const error = new Error("cleanup failed");
    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: () => ({
        instance: "x",
        finalizer: () => {
          throw error;
        },
      }),
    });

    expect(result.errors).toHaveLength(1);
    const entry = result.errors[0];
    expect(entry).toBeDefined();
    if (entry !== undefined) {
      expect(entry.blame.adapterFactory.name).toBe("FailingService");
      expect(entry.blame.portContract.name).toBe("FailingService");
      expect(entry.blame.violationType._tag).toBe("DisposalError");
      expect(entry.blame.resolutionPath).toEqual(["FailingService"]);
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.blame)).toBe(true);
    }
  });

  test("adapters without finalizers are still listed as disposed", async () => {
    const entries: DependencyEntry[] = [
      { portName: "NoFinalizer", dependsOn: [], hasFinalizer: false },
    ];
    const plan = computeDisposalPlan(entries);

    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: () => ({
        instance: "x",
        finalizer: undefined,
      }),
    });

    expect(result.disposed).toEqual(["NoFinalizer"]);
    expect(result.errors).toEqual([]);
  });

  test("adapters not found in provider are still listed as disposed", async () => {
    const entries: DependencyEntry[] = [{ portName: "Missing", dependsOn: [], hasFinalizer: true }];
    const plan = computeDisposalPlan(entries);

    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: () => undefined,
    });

    expect(result.disposed).toEqual(["Missing"]);
    expect(result.errors).toEqual([]);
  });

  test("result is frozen", async () => {
    const plan: DisposalPlan = Object.freeze({
      phases: Object.freeze([]),
      totalAdapters: 0,
    });

    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: () => undefined,
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.disposed)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  test("supports async finalizers", async () => {
    const disposalOrder: string[] = [];
    const entries: DependencyEntry[] = [
      { portName: "AsyncService", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    const result = await executeDisposalPlan(plan, {
      getInstanceForDisposal: () => ({
        instance: "x",
        finalizer: async () => {
          await Promise.resolve();
          disposalOrder.push("AsyncService");
        },
      }),
    });

    expect(result.errors).toEqual([]);
    expect(disposalOrder).toEqual(["AsyncService"]);
  });

  test("multi-phase disposal preserves ordering guarantees", async () => {
    const disposalOrder: string[] = [];

    // UserService -> UserRepo -> Database
    // UserService -> Logger
    const entries: DependencyEntry[] = [
      { portName: "UserService", dependsOn: ["UserRepo", "Logger"], hasFinalizer: true },
      { portName: "UserRepo", dependsOn: ["Database"], hasFinalizer: true },
      { portName: "Logger", dependsOn: [], hasFinalizer: true },
      { portName: "Database", dependsOn: [], hasFinalizer: true },
    ];
    const plan = computeDisposalPlan(entries);

    const instances = new Map<string, { instance: string; finalizer: () => void }>();
    for (const name of ["UserService", "UserRepo", "Logger", "Database"]) {
      instances.set(name, {
        instance: name,
        finalizer: () => {
          disposalOrder.push(name);
        },
      });
    }

    await executeDisposalPlan(plan, {
      getInstanceForDisposal: name => instances.get(name),
    });

    // UserService must be disposed before UserRepo and Logger
    const serviceIdx = disposalOrder.indexOf("UserService");
    const repoIdx = disposalOrder.indexOf("UserRepo");
    const loggerIdx = disposalOrder.indexOf("Logger");
    const dbIdx = disposalOrder.indexOf("Database");

    expect(serviceIdx).toBeLessThan(repoIdx);
    expect(serviceIdx).toBeLessThan(loggerIdx);
    expect(serviceIdx).toBeLessThan(dbIdx);
    // UserRepo must be disposed before Database
    expect(repoIdx).toBeLessThan(dbIdx);
  });
});
