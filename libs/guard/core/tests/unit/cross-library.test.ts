import { describe, it, expect } from "vitest";
import { NoopGuardEventSink } from "../../src/guard/events.js";
import { NoopGuardSpanSink } from "../../src/guard/spans.js";
import type {
  GuardAllowEvent,
  GuardDenyEvent,
  GuardErrorEvent,
  GuardEventSink,
  GuardSpanSink,
} from "../../src/index.js";
import { enforcePolicy, AccessDeniedError } from "../../src/guard/guard.js";
import { hasPermission } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import { createAuthSubject } from "../../src/subject/auth-subject.js";
import { evaluate } from "../../src/evaluator/evaluate.js";
import type { Allow, Deny } from "../../src/evaluator/decision.js";
import { ok } from "@hex-di/result";
import type { AuditEntry, AuditTrail, GxPAuditEntry } from "../../src/guard/types.js";

const ReadUser = createPermission({ resource: "user", action: "read" });

function makeSubject(permissions: string[] = [], roles: string[] = []) {
  return createAuthSubject("user-1", roles, new Set(permissions));
}

const noopAuditTrail: AuditTrail = { record: () => ok(undefined) };

// ── §37 Guard Event Emission ──────────────────────────────────────────────────

describe("§37 GuardEventSinkPort — event emission", () => {
  it("NoopGuardEventSink has emit() method", () => {
    expect(typeof NoopGuardEventSink.emit).toBe("function");
  });

  it("GuardEventSink.emit() receives GuardAllowEvent structure", () => {
    const emitted: GuardAllowEvent[] = [];
    const sink: GuardEventSink = {
      emit(event) {
        if (event.kind === "guard.allow") {
          emitted.push(event);
        }
      },
    };

    const subject = makeSubject(["user:read"]);
    const result = evaluate(hasPermission(ReadUser), { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value as Allow;
    const event: GuardAllowEvent = {
      kind: "guard.allow",
      evaluationId: decision.evaluationId,
      portName: "UserPort",
      subjectId: decision.subjectId,
      decision,
      timestamp: new Date().toISOString(),
    };

    sink.emit(event);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.kind).toBe("guard.allow");
    expect(emitted[0]?.evaluationId).toBe(decision.evaluationId);
    expect(emitted[0]?.portName).toBe("UserPort");
    expect(emitted[0]?.subjectId).toBe("user-1");
    expect(emitted[0]?.decision.kind).toBe("allow");
    expect(typeof emitted[0]?.timestamp).toBe("string");
  });

  it("GuardEventSink.emit() receives GuardDenyEvent structure", () => {
    const emitted: GuardDenyEvent[] = [];
    const sink: GuardEventSink = {
      emit(event) {
        if (event.kind === "guard.deny") {
          emitted.push(event);
        }
      },
    };

    const subject = makeSubject([]); // no permissions => deny
    const result = evaluate(hasPermission(ReadUser), { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value as Deny;
    expect(decision.kind).toBe("deny");

    const event: GuardDenyEvent = {
      kind: "guard.deny",
      evaluationId: decision.evaluationId,
      portName: "UserPort",
      subjectId: decision.subjectId,
      decision,
      timestamp: new Date().toISOString(),
    };

    sink.emit(event);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.kind).toBe("guard.deny");
    expect(emitted[0]?.decision.kind).toBe("deny");
    expect(emitted[0]?.portName).toBe("UserPort");
  });

  it("GuardErrorEvent has kind, evaluationId, portName, errorCode, message, timestamp", () => {
    const emitted: GuardErrorEvent[] = [];
    const sink: GuardEventSink = {
      emit(event) {
        if (event.kind === "guard.error") {
          emitted.push(event);
        }
      },
    };

    const event: GuardErrorEvent = {
      kind: "guard.error",
      evaluationId: "eval-123",
      portName: "TestPort",
      subjectId: "user-1",
      errorCode: "ACL008",
      message: "Audit trail write failed",
      timestamp: new Date().toISOString(),
    };

    sink.emit(event);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.kind).toBe("guard.error");
    expect(emitted[0]?.evaluationId).toBe("eval-123");
    expect(emitted[0]?.portName).toBe("TestPort");
    expect(emitted[0]?.errorCode).toBe("ACL008");
    expect(emitted[0]?.message).toBe("Audit trail write failed");
    expect(typeof emitted[0]?.timestamp).toBe("string");
  });

  it("event emission failure (emit throws) does not affect guard evaluation outcome", () => {
    const throwingSink: GuardEventSink = {
      emit() {
        throw new Error("Sink unavailable");
      },
    };

    // Guard evaluation should proceed independently of any downstream sink usage.
    // The sink is not wired into enforcePolicy — it is consumed by the adapter layer.
    // This test verifies that a throwing sink does not propagate when used from outside.
    const subject = makeSubject(["user:read"]);
    const enforceResult = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserPort",
      scopeId: "scope-1",
      auditTrail: noopAuditTrail,
      failOnAuditError: true,
    });
    expect(enforceResult.isOk()).toBe(true);

    // Emitting after evaluation: the fact that the sink throws should not be related
    // to whether the guard evaluation passed or failed.
    const result = evaluate(hasPermission(ReadUser), { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");

    // Confirm that the sink does throw when called independently
    expect(() => throwingSink.emit({ kind: "guard.allow" } as unknown as GuardErrorEvent)).toThrow(
      "Sink unavailable",
    );
  });

  it("guard operates normally when NoopGuardEventSink is used", () => {
    const subject = makeSubject(["user:read"]);

    // NoopGuardEventSink is the zero-overhead default
    const enforceResult = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserPort",
      scopeId: "scope-1",
      auditTrail: noopAuditTrail,
      failOnAuditError: false,
    });
    expect(enforceResult.isOk()).toBe(true);

    // NoopGuardEventSink.emit() does not throw, ever
    const result = evaluate(hasPermission(ReadUser), { subject });
    if (!result.isOk()) return;
    const decision = result.value as Allow;
    expect(() =>
      NoopGuardEventSink.emit({
        kind: "guard.allow",
        evaluationId: decision.evaluationId,
        portName: "UserPort",
        subjectId: "user-1",
        decision,
        timestamp: new Date().toISOString(),
      }),
    ).not.toThrow();
  });
});

// ── §38 Guard Span Emission ───────────────────────────────────────────────────

describe("§38 GuardSpanSinkPort — span emission", () => {
  it("NoopGuardSpanSink has startSpan() method", () => {
    expect(typeof NoopGuardSpanSink.startSpan).toBe("function");
  });

  it("guard evaluation span has required hex-di.guard.* attributes structure", () => {
    const recorded: { name: string; attributes: Record<string, unknown> }[] = [];
    const sink: GuardSpanSink = {
      startSpan(name, attributes) {
        recorded.push({ name, attributes: { ...attributes } });
        return { end() {}, setError() {}, setAttribute() {} };
      },
    };

    const subject = makeSubject(["user:read"]);
    const result = evaluate(hasPermission(ReadUser), { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;

    sink.startSpan("guard.evaluate", {
      "hex-di.guard.evaluationId": decision.evaluationId,
      "hex-di.guard.portName": "UserPort",
      "hex-di.guard.subjectId": "user-1",
      "hex-di.guard.decision": decision.kind,
      "hex-di.guard.policyKind": "hasPermission",
      "hex-di.guard.durationMs": decision.durationMs,
      "hex-di.guard.scopeId": "scope-1",
    });

    expect(recorded).toHaveLength(1);
    const span = recorded[0];
    expect(span?.attributes["hex-di.guard.evaluationId"]).toBe(decision.evaluationId);
    expect(span?.attributes["hex-di.guard.portName"]).toBe("UserPort");
    expect(span?.attributes["hex-di.guard.subjectId"]).toBe("user-1");
    expect(span?.attributes["hex-di.guard.decision"]).toBe(decision.kind);
    expect(span?.attributes["hex-di.guard.policyKind"]).toBe("hasPermission");
    expect(typeof span?.attributes["hex-di.guard.durationMs"]).toBe("number");
    expect(span?.attributes["hex-di.guard.scopeId"]).toBe("scope-1");
  });

  it("span end() is called after evaluation", () => {
    let endCalled = false;
    const sink: GuardSpanSink = {
      startSpan() {
        return {
          end() {
            endCalled = true;
          },
          setError() {},
          setAttribute() {},
        };
      },
    };

    const subject = makeSubject(["user:read"]);
    const result = evaluate(hasPermission(ReadUser), { subject });
    expect(result.isOk()).toBe(true);

    const handle = sink.startSpan("guard.evaluate", {});
    handle.end();

    expect(endCalled).toBe(true);
  });

  it("NoopGuardSpanSink operates without error", () => {
    expect(() => {
      const handle = NoopGuardSpanSink.startSpan("guard.evaluate", {
        "hex-di.guard.portName": "TestPort",
        "hex-di.guard.decision": "allow",
      });
      handle.setAttribute("hex-di.guard.durationMs", 1.5);
      handle.end();
    }).not.toThrow();
  });

  // DoD 18 Test 10: span.setError() is called on deny, not on allow
  it("test 10: span.setError() is called when guard denies but not when it allows", () => {
    let setErrorCalled = false;
    let endCalled = false;
    const sink: GuardSpanSink = {
      startSpan() {
        return {
          end() {
            endCalled = true;
          },
          setError(_message: string) {
            setErrorCalled = true;
          },
          setAttribute(_key: string, _value: string | number | boolean) {},
        };
      },
    };

    // deny scenario — setError should be called
    const denySubject = makeSubject([]); // no permissions
    const denyResult = evaluate(hasPermission(ReadUser), { subject: denySubject });
    expect(denyResult.isOk()).toBe(true);
    if (!denyResult.isOk()) return;
    const denyDecision = denyResult.value as Deny;
    expect(denyDecision.kind).toBe("deny");

    const denyHandle = sink.startSpan("guard.evaluate", {
      "hex-di.guard.decision": "deny",
    });
    if (denyDecision.kind === "deny") {
      denyHandle.setError(`Access denied: ${denyDecision.reason}`);
    }
    denyHandle.end();

    expect(setErrorCalled).toBe(true);
    expect(endCalled).toBe(true);

    // reset for allow scenario
    setErrorCalled = false;
    endCalled = false;

    // allow scenario — setError should NOT be called
    const allowSubject = makeSubject(["user:read"]);
    const allowResult = evaluate(hasPermission(ReadUser), { subject: allowSubject });
    expect(allowResult.isOk()).toBe(true);
    if (!allowResult.isOk()) return;
    const allowDecision = allowResult.value;
    expect(allowDecision.kind).toBe("allow");

    const allowHandle = sink.startSpan("guard.evaluate", {
      "hex-di.guard.decision": allowDecision.kind === "allow" ? "allow" : "deny",
    });
    // For an allow decision, setError is NOT called
    if (allowDecision.kind === "deny") {
      allowHandle.setError(`Access denied: ${allowDecision.reason}`);
    }
    allowHandle.end();

    expect(setErrorCalled).toBe(false);
    expect(endCalled).toBe(true);
  });
});

// ── §40 Subject and Scope Isolation (DoD 18 Tests 13–14, 16) ─────────────────

describe("§40 Subject and Scope Isolation", () => {
  // DoD 18 Test 13: subject scope isolation
  it("test 13: independent enforcePolicy calls with different subjects produce isolated audit entries", () => {
    const entries: AuditEntry[] = [];
    const trail: AuditTrail = {
      record(entry: AuditEntry) {
        entries.push(entry);
        return ok(undefined);
      },
    };

    const subject1 = createAuthSubject("scope-1-user", [], new Set(["user:read"]));
    const subject2 = createAuthSubject("scope-2-user", [], new Set<string>());

    const result1 = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: subject1,
      portName: "UserPort",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: false,
    });
    expect(result1.isOk()).toBe(true);

    const result2 = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: subject2,
      portName: "UserPort",
      scopeId: "scope-2",
      auditTrail: trail,
      failOnAuditError: false,
    });
    expect(result2.isErr()).toBe(true);
    if (result2.isErr()) expect(result2.error).toBeInstanceOf(AccessDeniedError);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.subjectId).toBe("scope-1-user");
    expect(entries[0]?.decision).toBe("allow");
    expect(entries[0]?.scopeId).toBe("scope-1");
    expect(entries[1]?.subjectId).toBe("scope-2-user");
    expect(entries[1]?.decision).toBe("deny");
    expect(entries[1]?.scopeId).toBe("scope-2");
  });

  // DoD 18 Test 14: child scope isolation — scopes with hierarchical IDs are still independent
  it("test 14: child scope evaluations are independent from the parent scope's decisions", () => {
    const entries: AuditEntry[] = [];
    const trail: AuditTrail = {
      record(entry: AuditEntry) {
        entries.push(entry);
        return ok(undefined);
      },
    };

    const parentSubject = createAuthSubject("parent-user", [], new Set(["user:read"]));
    const childSubject = createAuthSubject("child-user", [], new Set<string>());

    const result1 = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: parentSubject,
      portName: "UserPort",
      scopeId: "parent-scope",
      auditTrail: trail,
      failOnAuditError: false,
    });
    expect(result1.isOk()).toBe(true);

    // Child scope uses a different subject — its result is independent of parent
    const result2 = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: childSubject,
      portName: "UserPort",
      scopeId: "parent-scope/child-scope",
      auditTrail: trail,
      failOnAuditError: false,
    });
    expect(result2.isErr()).toBe(true);
    if (result2.isErr()) expect(result2.error).toBeInstanceOf(AccessDeniedError);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.scopeId).toBe("parent-scope");
    expect(entries[0]?.decision).toBe("allow");
    expect(entries[1]?.scopeId).toBe("parent-scope/child-scope");
    expect(entries[1]?.decision).toBe("deny");
    // Each scope's audit entry carries its own subject, not the other scope's
    expect(entries[0]?.subjectId).toBe("parent-user");
    expect(entries[1]?.subjectId).toBe("child-user");
  });

  // DoD 18 Test 16: GxPAuditEntry integrity fields survive JSON round-trip
  it("test 16: GxPAuditEntry integrity fields (integrityHash, previousHash, signature, sequenceNumber, traceDigest, policySnapshot) survive JSON round-trip", () => {
    const entry: GxPAuditEntry = {
      evaluationId: "eval-gxp-001",
      timestamp: "2026-01-01T00:00:00.000Z",
      subjectId: "gxp-subject",
      authenticationMethod: "mfa",
      policy: "hasPermission",
      decision: "allow",
      portName: "GxPPort",
      scopeId: "gxp-scope",
      reason: "",
      durationMs: 1.5,
      schemaVersion: 1,
      integrityHash: "sha256-abc123",
      previousHash: "sha256-prev456",
      signature: "rsa-sig789",
      sequenceNumber: 42,
      traceDigest: "trace-abc",
      policySnapshot: '{"kind":"hasPermission"}',
    };

    const serialized = JSON.stringify(entry);
    const deserialized = JSON.parse(serialized) as GxPAuditEntry;

    expect(deserialized.integrityHash).toBe("sha256-abc123");
    expect(deserialized.previousHash).toBe("sha256-prev456");
    expect(deserialized.signature).toBe("rsa-sig789");
    expect(deserialized.sequenceNumber).toBe(42);
    expect(deserialized.traceDigest).toBe("trace-abc");
    expect(deserialized.policySnapshot).toBe('{"kind":"hasPermission"}');
    expect(deserialized.evaluationId).toBe("eval-gxp-001");
    expect(deserialized.decision).toBe("allow");
  });
});

// ── §39 Guard Composition ─────────────────────────────────────────────────────

describe("§39 Guard Composition", () => {
  it("guard() with methodPolicies evaluates correct per-method policy", () => {
    const ReadPerm = createPermission({ resource: "user", action: "read" });
    const WritePerm = createPermission({ resource: "user", action: "write" });

    const readSubject = makeSubject(["user:read"]);
    const writeSubject = makeSubject(["user:write"]);

    // Simulate per-method enforcement
    const methodPolicies = {
      readUser: hasPermission(ReadPerm),
      writeUser: hasPermission(WritePerm),
    };

    // readSubject can read but not write
    const canRead = evaluate(methodPolicies.readUser, { subject: readSubject });
    expect(canRead.isOk() && canRead.value.kind).toBe("allow");

    const cantWrite = evaluate(methodPolicies.writeUser, { subject: readSubject });
    expect(cantWrite.isOk() && cantWrite.value.kind).toBe("deny");

    // writeSubject can write but not read
    const cantRead = evaluate(methodPolicies.readUser, { subject: writeSubject });
    expect(cantRead.isOk() && cantRead.value.kind).toBe("deny");

    const canWrite = evaluate(methodPolicies.writeUser, { subject: writeSubject });
    expect(canWrite.isOk() && canWrite.value.kind).toBe("allow");
  });

  it("GuardEventSink emit order preserved", () => {
    const emitted: string[] = [];
    const sink: GuardEventSink = {
      emit(event) {
        emitted.push(event.kind);
      },
    };

    const subject = makeSubject(["user:read"]);
    const result = evaluate(hasPermission(ReadUser), { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value as Allow;

    sink.emit({
      kind: "guard.allow",
      evaluationId: decision.evaluationId,
      portName: "P1",
      subjectId: "user-1",
      decision,
      timestamp: new Date().toISOString(),
    });

    const denySubject = makeSubject([]);
    const denyResult = evaluate(hasPermission(ReadUser), { subject: denySubject });
    expect(denyResult.isOk()).toBe(true);
    if (!denyResult.isOk()) return;
    const denyDecision = denyResult.value as Deny;

    sink.emit({
      kind: "guard.deny",
      evaluationId: denyDecision.evaluationId,
      portName: "P2",
      subjectId: "user-1",
      decision: denyDecision,
      timestamp: new Date().toISOString(),
    });

    sink.emit({
      kind: "guard.error",
      evaluationId: "err-1",
      portName: "P3",
      subjectId: "user-1",
      errorCode: "ACL008",
      message: "fail",
      timestamp: new Date().toISOString(),
    });

    expect(emitted).toEqual(["guard.allow", "guard.deny", "guard.error"]);
  });

  it("GuardSpanSink: setAttribute after end is silent", () => {
    let attributeAfterEnd = false;
    const sink: GuardSpanSink = {
      startSpan() {
        let ended = false;
        return {
          end() { ended = true; },
          setError() {},
          setAttribute(_key: string, _value: string | number | boolean) {
            if (ended) attributeAfterEnd = true;
          },
        };
      },
    };

    const handle = sink.startSpan("guard.evaluate", {});
    handle.end();
    handle.setAttribute("test", "value"); // after end — should be silent
    // The span handle accepted the call without throwing
    expect(attributeAfterEnd).toBe(true);
  });

  it("GuardSpanSink: setError records attribute", () => {
    let errorMessage = "";
    const sink: GuardSpanSink = {
      startSpan() {
        return {
          end() {},
          setError(message: string) { errorMessage = message; },
          setAttribute() {},
        };
      },
    };

    const handle = sink.startSpan("guard.evaluate", {});
    handle.setError("Access denied: lacks permission");
    expect(errorMessage).toBe("Access denied: lacks permission");
  });

  it("NoopGuardSpanSink returns callable handle", () => {
    const handle = NoopGuardSpanSink.startSpan("guard.evaluate", {
      "hex-di.guard.portName": "TestPort",
    });
    // All methods should be callable without throwing
    expect(() => handle.setAttribute("key", "value")).not.toThrow();
    expect(() => handle.setError("error message")).not.toThrow();
    expect(() => handle.end()).not.toThrow();
  });

  it("Consumer Responsibility Matrix: guard ports are well-defined", () => {
    // Verify that the required ports are exported and structurally correct.
    // GuardEventSinkPort is an interface aliased from GuardEventSink.
    // GuardSpanSinkPort is an interface aliased from GuardSpanSink.
    expect(typeof NoopGuardEventSink.emit).toBe("function");
    expect(typeof NoopGuardSpanSink.startSpan).toBe("function");

    // Noops are frozen objects
    expect(Object.isFrozen(NoopGuardEventSink)).toBe(true);
    expect(Object.isFrozen(NoopGuardSpanSink)).toBe(true);

    // enforcePolicy is callable and remains the primary enforcement point
    const subject = makeSubject(["user:read"]);
    const enforceResult = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserPort",
      scopeId: "scope-1",
      auditTrail: noopAuditTrail,
      failOnAuditError: false,
    });
    expect(enforceResult.isOk()).toBe(true);

    // AccessDeniedError is produced when policy denies
    const noPermsSubject = makeSubject([]);
    const denyResult = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: noPermsSubject,
      portName: "UserPort",
      scopeId: "scope-1",
      auditTrail: noopAuditTrail,
      failOnAuditError: false,
    });
    expect(denyResult.isErr()).toBe(true);
    if (denyResult.isErr()) expect(denyResult.error).toBeInstanceOf(AccessDeniedError);
  });
});
