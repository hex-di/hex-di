/**
 * Unit tests for Guard Panel mock data source.
 *
 * Spec: 14-integration.md Section 14.2
 */

import { describe, it, expect, vi } from "vitest";
import { MockGuardDataSource } from "../../../src/panels/guard/mock-data-source.js";
import type {
  GuardDataEvent,
  GuardEvaluationDescriptor,
  GuardEvaluationExecution,
  GuardPortStatistics,
  SerializedRole,
  SerializedSubject,
  EvaluationNodeTrace,
  PolicyNodeDescriptor,
} from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makeNode(overrides?: Partial<PolicyNodeDescriptor>): PolicyNodeDescriptor {
  return {
    nodeId: "node-0",
    kind: "hasRole",
    label: undefined,
    children: [],
    leafData: { type: "hasRole", roleName: "admin" },
    depth: 0,
    fieldStrategy: undefined,
    ...overrides,
  };
}

function makeDescriptor(overrides?: Partial<GuardEvaluationDescriptor>): GuardEvaluationDescriptor {
  return {
    descriptorId: "guard:testPort",
    portName: "testPort",
    label: "testPort",
    rootNode: makeNode(),
    leafCount: 1,
    maxDepth: 0,
    policyKinds: new Set(["hasRole"]),
    hasAsyncPolicies: false,
    sourceLocation: undefined,
    ...overrides,
  };
}

function makeSubject(overrides?: Partial<SerializedSubject>): SerializedSubject {
  return {
    id: "user-1",
    roles: ["admin"],
    permissions: ["docs:read"],
    attributes: {},
    authenticationMethod: "jwt",
    authenticatedAt: "2026-01-01T00:00:00Z",
    identityProvider: undefined,
    ...overrides,
  };
}

function makeTrace(overrides?: Partial<EvaluationNodeTrace>): EvaluationNodeTrace {
  return {
    nodeId: "node-0",
    kind: "hasRole",
    result: "allow",
    evaluated: true,
    durationMs: 0.5,
    children: [],
    reason: undefined,
    resolvedValue: undefined,
    asyncResolution: false,
    visibleFields: undefined,
    ...overrides,
  };
}

function makeExecution(overrides?: Partial<GuardEvaluationExecution>): GuardEvaluationExecution {
  return {
    executionId: "exec-1",
    descriptorId: "guard:testPort",
    portName: "testPort",
    subject: makeSubject(),
    decision: "allow",
    rootTrace: makeTrace(),
    durationMs: 0.5,
    evaluatedAt: "2026-01-01T00:00:00Z",
    reason: undefined,
    visibleFields: undefined,
    ...overrides,
  };
}

function makePortStats(overrides?: Partial<GuardPortStatistics>): GuardPortStatistics {
  return {
    portName: "testPort",
    totalEvaluations: 100,
    allowCount: 90,
    denyCount: 10,
    errorCount: 0,
    allowRate: 0.9,
    topDenyReason: "missing role",
    uniqueSubjects: 5,
    policyKind: "hasRole",
    ...overrides,
  };
}

function makeRole(overrides?: Partial<SerializedRole>): SerializedRole {
  return {
    name: "admin",
    directPermissions: ["docs:read", "docs:write"],
    inherits: [],
    flattenedPermissions: ["docs:read", "docs:write"],
    hasCircularInheritance: false,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("MockGuardDataSource", () => {
  it("starts empty", () => {
    const ds = new MockGuardDataSource();
    expect(ds.getDescriptors().size).toBe(0);
    expect(ds.getPortStatistics().size).toBe(0);
    expect(ds.getExecutions("any")).toEqual([]);
    expect(ds.getRoleHierarchy()).toEqual([]);
  });

  it("registers a descriptor and emits event", () => {
    const ds = new MockGuardDataSource();
    const listener = vi.fn<(event: GuardDataEvent) => void>();
    ds.subscribe(listener);

    const descriptor = makeDescriptor();
    ds.registerDescriptor(descriptor);

    expect(ds.getDescriptors().size).toBe(1);
    expect(ds.getDescriptors().get("guard:testPort")).toBe(descriptor);
    expect(listener).toHaveBeenCalledWith({
      type: "descriptor-registered",
      descriptorId: "guard:testPort",
    });
  });

  it("adds executions and emits events", () => {
    const ds = new MockGuardDataSource();
    const listener = vi.fn<(event: GuardDataEvent) => void>();
    ds.subscribe(listener);

    ds.registerDescriptor(makeDescriptor());

    const exec = makeExecution();
    ds.addExecution(exec);

    const execs = ds.getExecutions("testPort");
    expect(execs.length).toBe(1);
    expect(execs[0].executionId).toBe("exec-1");

    expect(listener).toHaveBeenCalledWith({
      type: "execution-added",
      portName: "testPort",
      executionId: "exec-1",
    });
  });

  it("enforces ring buffer limit", () => {
    const ds = new MockGuardDataSource({ maxExecutionsPerPort: 3 });
    ds.registerDescriptor(makeDescriptor());

    for (let i = 0; i < 5; i++) {
      ds.addExecution(
        makeExecution({
          executionId: `exec-${i}`,
          evaluatedAt: `2026-01-01T00:0${i}:00Z`,
        })
      );
    }

    const execs = ds.getExecutions("testPort");
    expect(execs.length).toBe(3);
    // Should have kept the newest (exec-2, exec-3, exec-4)
    expect(execs.map(e => e.executionId)).toContain("exec-4");
    expect(execs.map(e => e.executionId)).not.toContain("exec-0");
  });

  it("returns executions sorted newest first", () => {
    const ds = new MockGuardDataSource();
    ds.registerDescriptor(makeDescriptor());

    ds.addExecution(makeExecution({ executionId: "exec-1", evaluatedAt: "2026-01-01T00:01:00Z" }));
    ds.addExecution(makeExecution({ executionId: "exec-2", evaluatedAt: "2026-01-01T00:03:00Z" }));
    ds.addExecution(makeExecution({ executionId: "exec-3", evaluatedAt: "2026-01-01T00:02:00Z" }));

    const execs = ds.getExecutions("testPort");
    expect(execs[0].executionId).toBe("exec-2");
    expect(execs[1].executionId).toBe("exec-3");
    expect(execs[2].executionId).toBe("exec-1");
  });

  it("sets port statistics and emits event", () => {
    const ds = new MockGuardDataSource();
    const listener = vi.fn<(event: GuardDataEvent) => void>();
    ds.subscribe(listener);

    const stats = makePortStats();
    ds.setPortStatistics("testPort", stats);

    expect(ds.getPortStatistics().get("testPort")).toBe(stats);
    expect(listener).toHaveBeenCalledWith({
      type: "statistics-updated",
      portName: "testPort",
    });
  });

  it("sets role hierarchy and emits event", () => {
    const ds = new MockGuardDataSource();
    const listener = vi.fn<(event: GuardDataEvent) => void>();
    ds.subscribe(listener);

    const roles = [makeRole(), makeRole({ name: "editor" })];
    ds.setRoleHierarchy(roles);

    expect(ds.getRoleHierarchy().length).toBe(2);
    expect(listener).toHaveBeenCalledWith({ type: "role-hierarchy-updated" });
  });

  it("unsubscribes correctly", () => {
    const ds = new MockGuardDataSource();
    const listener = vi.fn<(event: GuardDataEvent) => void>();
    const unsub = ds.subscribe(listener);

    ds.registerDescriptor(makeDescriptor());
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    ds.registerDescriptor(makeDescriptor({ descriptorId: "guard:other", portName: "other" }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("getSnapshot aggregates all data", () => {
    const ds = new MockGuardDataSource();
    ds.registerDescriptor(makeDescriptor());
    ds.addExecution(makeExecution());
    ds.setPortStatistics("testPort", makePortStats());
    ds.setRoleHierarchy([makeRole()]);

    const snapshot = ds.getSnapshot();
    expect(snapshot.descriptors.size).toBe(1);
    expect(snapshot.portStats.size).toBe(1);
    expect(snapshot.recentExecutions.length).toBe(1);
    expect(snapshot.roleHierarchy.length).toBe(1);
    expect(snapshot.totalEvaluationsObserved).toBe(100);
    expect(snapshot.globalAllowRate).toBe(0.9);
  });

  it("emitEvent broadcasts custom events", () => {
    const ds = new MockGuardDataSource();
    const listener = vi.fn<(event: GuardDataEvent) => void>();
    ds.subscribe(listener);

    ds.emitEvent({ type: "connection-lost" });
    expect(listener).toHaveBeenCalledWith({ type: "connection-lost" });
  });

  it("getPaths returns empty for unknown descriptor", () => {
    const ds = new MockGuardDataSource();
    expect(ds.getPaths("nonexistent")).toEqual([]);
  });
});
