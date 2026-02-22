import { describe, it, expect } from "vitest";
import { GuardInspector } from "../../src/inspection/inspector.js";
import type { GuardEvent } from "../../src/guard/events.js";
import type { Decision, EvaluationTrace } from "../../src/evaluator/decision.js";

function makeAllowEvent(overrides: Partial<{
  evaluationId: string;
  portName: string;
  subjectId: string;
}> = {}): GuardEvent {
  const allowTrace: EvaluationTrace = { policyKind: "hasRole", result: "allow", durationMs: 0.5 };
  const decision: Decision & { kind: "allow" } = Object.freeze({
    kind: "allow",
    evaluationId: overrides.evaluationId ?? "eval-1",
    evaluatedAt: new Date().toISOString(),
    subjectId: overrides.subjectId ?? "user-1",
    policy: { kind: "hasRole", roleName: "viewer" } as const,
    trace: allowTrace,
    durationMs: 1,
  });

  return Object.freeze({
    kind: "guard.allow",
    evaluationId: overrides.evaluationId ?? "eval-1",
    portName: overrides.portName ?? "TestPort",
    subjectId: overrides.subjectId ?? "user-1",
    decision,
    timestamp: new Date().toISOString(),
  });
}

function makeDenyEvent(overrides: Partial<{
  evaluationId: string;
  portName: string;
  subjectId: string;
}> = {}): GuardEvent {
  const denyTrace: EvaluationTrace = { policyKind: "hasRole", result: "deny", reason: "lacks role", durationMs: 0.5 };
  const decision: Decision & { kind: "deny" } = Object.freeze({
    kind: "deny",
    evaluationId: overrides.evaluationId ?? "eval-2",
    evaluatedAt: new Date().toISOString(),
    subjectId: overrides.subjectId ?? "user-1",
    policy: { kind: "hasRole", roleName: "admin" } as const,
    trace: denyTrace,
    durationMs: 1,
    reason: "Denied by policy",
  });

  return Object.freeze({
    kind: "guard.deny",
    evaluationId: overrides.evaluationId ?? "eval-2",
    portName: overrides.portName ?? "TestPort",
    subjectId: overrides.subjectId ?? "user-1",
    decision,
    timestamp: new Date().toISOString(),
  });
}

describe("GuardInspector", () => {
  it("starts with empty snapshot", () => {
    const inspector = new GuardInspector();
    const snapshot = inspector.getSnapshot();
    expect(snapshot.activePolicies).toEqual({});
    expect(snapshot.recentDecisions).toHaveLength(0);
    expect(snapshot.permissionStats).toEqual({});
  });

  it("has name 'guard'", () => {
    const inspector = new GuardInspector();
    expect(inspector.name).toBe("guard");
  });

  it("onEvent() records allow decisions", () => {
    const inspector = new GuardInspector();
    inspector.onEvent(makeAllowEvent({ portName: "DocPort" }));

    const snapshot = inspector.getSnapshot();
    expect(snapshot.recentDecisions).toHaveLength(1);
    expect(snapshot.recentDecisions[0].decision).toBe("allow");
    expect(snapshot.recentDecisions[0].portName).toBe("DocPort");
  });

  it("onEvent() records deny decisions", () => {
    const inspector = new GuardInspector();
    inspector.onEvent(makeDenyEvent({ portName: "AdminPort" }));

    const snapshot = inspector.getSnapshot();
    expect(snapshot.recentDecisions).toHaveLength(1);
    expect(snapshot.recentDecisions[0].decision).toBe("deny");
    expect(snapshot.recentDecisions[0].portName).toBe("AdminPort");
  });

  it("tracks permission stats per port", () => {
    const inspector = new GuardInspector();
    inspector.onEvent(makeAllowEvent({ portName: "DocPort" }));
    inspector.onEvent(makeAllowEvent({ portName: "DocPort" }));
    inspector.onEvent(makeDenyEvent({ portName: "DocPort" }));

    const snapshot = inspector.getSnapshot();
    const stats = snapshot.permissionStats["DocPort"];
    expect(stats).toBeDefined();
    expect(stats?.allow).toBe(2);
    expect(stats?.deny).toBe(1);
  });

  it("subscribe() notifies listener on events", () => {
    const inspector = new GuardInspector();
    const received: GuardEvent[] = [];
    inspector.subscribe((e) => received.push(e));

    inspector.onEvent(makeAllowEvent());
    inspector.onEvent(makeDenyEvent());

    expect(received).toHaveLength(2);
  });

  it("subscribe() returns unsubscribe function", () => {
    const inspector = new GuardInspector();
    const received: GuardEvent[] = [];
    const unsubscribe = inspector.subscribe((e) => received.push(e));

    inspector.onEvent(makeAllowEvent({ evaluationId: "e1" }));
    unsubscribe();
    inspector.onEvent(makeAllowEvent({ evaluationId: "e2" }));

    expect(received).toHaveLength(1);
    expect(received[0].evaluationId).toBe("e1");
  });

  it("registerPolicy() records active policy for port", () => {
    const inspector = new GuardInspector();
    inspector.registerPolicy("UserPort", "allOf");

    const snapshot = inspector.getSnapshot();
    expect(snapshot.activePolicies["UserPort"]).toBe("allOf");
  });

  it("reset() clears all state", () => {
    const inspector = new GuardInspector();
    inspector.onEvent(makeAllowEvent());
    inspector.registerPolicy("Port", "hasRole");
    inspector.reset();

    const snapshot = inspector.getSnapshot();
    expect(snapshot.recentDecisions).toHaveLength(0);
    expect(snapshot.activePolicies).toEqual({});
    expect(snapshot.permissionStats).toEqual({});
  });

  it("caps recentDecisions at 100 entries", () => {
    const inspector = new GuardInspector();
    for (let i = 0; i < 110; i++) {
      inspector.onEvent(makeAllowEvent({ evaluationId: `eval-${i}` }));
    }
    const snapshot = inspector.getSnapshot();
    expect(snapshot.recentDecisions).toHaveLength(100);
    // Should keep the most recent entries
    expect(snapshot.recentDecisions[99].evaluationId).toBe("eval-109");
  });

  it("error events do not increment stats", () => {
    const inspector = new GuardInspector();
    const errorEvent: GuardEvent = {
      kind: "guard.error",
      evaluationId: "eval-err",
      portName: "TestPort",
      subjectId: "user-1",
      errorCode: "ACL008",
      message: "Audit write failed",
      timestamp: new Date().toISOString(),
    };
    inspector.onEvent(errorEvent);

    const snapshot = inspector.getSnapshot();
    expect(snapshot.permissionStats["TestPort"]).toBeUndefined();
  });

  it("getSnapshot() returns frozen objects", () => {
    const inspector = new GuardInspector();
    const snapshot = inspector.getSnapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.activePolicies)).toBe(true);
    expect(Object.isFrozen(snapshot.recentDecisions)).toBe(true);
    expect(Object.isFrozen(snapshot.permissionStats)).toBe(true);
  });
});
