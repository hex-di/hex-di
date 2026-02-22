import { describe, it, expect } from "vitest";
import {
  enforcePolicy,
  AccessDeniedError,
  createNoopAuditTrailAdapter,
} from "../../src/guard/guard.js";
import { hasPermission, hasRole } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import { createAuthSubject } from "../../src/subject/auth-subject.js";
import { ok, err } from "@hex-di/result";
import type { AuditEntry, AuditTrail } from "../../src/guard/types.js";

const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });

function makeSubject(permissions: string[] = [], roles: string[] = [], id = "user-1") {
  return createAuthSubject(id, roles, new Set(permissions));
}

// Simple in-memory audit trail for integration tests (no external dep needed)
function createInMemoryTrail() {
  const entries: AuditEntry[] = [];
  const trail: AuditTrail = {
    record(entry: AuditEntry) {
      entries.push(entry);
      return ok(undefined);
    },
  };
  return { trail, entries };
}

describe("DoD 7 — guard adapter integration", () => {
  it("guard() with full subject provider resolves correctly end-to-end", () => {
    const subject = makeSubject(["user:read"], ["viewer"]);
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
    });
    expect(result.isOk()).toBe(true);
  });

  it("guard() + MemoryAuditTrail records allow decisions", () => {
    const { trail, entries } = createInMemoryTrail();
    const subject = makeSubject(["user:read"]);

    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: true,
    });

    expect(result.isOk()).toBe(true);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.decision).toBe("allow");
    expect(entries[0]?.portName).toBe("UserRepo");
    expect(entries[0]?.subjectId).toBe("user-1");
  });

  it("guard() + MemoryAuditTrail records deny decisions", () => {
    const { trail, entries } = createInMemoryTrail();
    const subject = makeSubject([]); // no permissions

    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: true,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.decision).toBe("deny");
    expect(entries[0]?.portName).toBe("UserRepo");
  });

  it("guard() with NoopAuditTrail returns Ok", () => {
    const noop = createNoopAuditTrailAdapter();
    const subject = makeSubject(["user:read"]);

    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: noop,
      failOnAuditError: true,
    });

    expect(result.isOk()).toBe(true);
  });

  it("different scopes get different subjects", () => {
    const subject1 = makeSubject(["user:read"], [], "user-scope-1");
    const subject2 = makeSubject(["user:write"], [], "user-scope-2");
    const { trail, entries } = createInMemoryTrail();

    const result1 = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: subject1,
      portName: "Repo",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: true,
    });
    expect(result1.isOk()).toBe(true);

    const result2 = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: subject2,
      portName: "Repo",
      scopeId: "scope-2",
      auditTrail: trail,
      failOnAuditError: true,
    });
    expect(result2.isErr()).toBe(true);
    if (result2.isErr()) expect(result2.error).toBeInstanceOf(AccessDeniedError);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.subjectId).toBe("user-scope-1");
    expect(entries[0]?.scopeId).toBe("scope-1");
    expect(entries[1]?.subjectId).toBe("user-scope-2");
    expect(entries[1]?.scopeId).toBe("scope-2");
  });

  it("failOnAuditError: false returns Ok on write failure", () => {
    const subject = makeSubject(["user:read"]);
    const failingTrail: AuditTrail = {
      record: () => err({ code: "ACL008" as const, message: "Disk full" }),
    };

    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: failingTrail,
      failOnAuditError: false,
    });

    expect(result.isOk()).toBe(true);
  });

  it("guard() with methodPolicies enforces per-method policies", () => {
    const methodPolicies = {
      read: hasPermission(ReadUser),
      write: hasPermission(WriteUser),
    };
    const readOnlySubject = makeSubject(["user:read"]);
    const { trail, entries } = createInMemoryTrail();

    // read is allowed
    const readResult = enforcePolicy({
      policy: methodPolicies.read,
      subject: readOnlySubject,
      portName: "UserRepo.read",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: true,
    });
    expect(readResult.isOk()).toBe(true);

    // write is denied
    const writeResult = enforcePolicy({
      policy: methodPolicies.write,
      subject: readOnlySubject,
      portName: "UserRepo.write",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: true,
    });
    expect(writeResult.isErr()).toBe(true);
    if (writeResult.isErr()) expect(writeResult.error).toBeInstanceOf(AccessDeniedError);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.decision).toBe("allow");
    expect(entries[1]?.decision).toBe("deny");
  });

  it("AccessDeniedError carries the decision and portName", () => {
    const subject = makeSubject([], ["viewer"]);

    const result = enforcePolicy({
      policy: hasRole("admin"),
      subject,
      portName: "AdminPortal",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(AccessDeniedError);
      if (result.error instanceof AccessDeniedError) {
        expect(result.error.portName).toBe("AdminPortal");
        expect(result.error.decision.kind).toBe("deny");
        expect(result.error.subjectId).toBe("user-1");
      }
    }
  });

  // DoD 7 Test 32: fieldMaskAdapter is called when Allow has visibleFields
  it("test 32: fieldMaskAdapter.onVisibleFields is called when Allow decision carries visibleFields", () => {
    const subject = makeSubject(["user:read"]);
    const policyWithFields = hasPermission(ReadUser, { fields: ["id", "name", "email"] });
    const calledWith: { fields: ReadonlyArray<string>; evaluationId: string }[] = [];

    const result = enforcePolicy({
      policy: policyWithFields,
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
      fieldMaskAdapter: {
        onVisibleFields(fields, evaluationId) {
          calledWith.push({ fields, evaluationId });
        },
      },
    });

    expect(result.isOk()).toBe(true);
    expect(calledWith).toHaveLength(1);
    expect(calledWith[0]?.fields).toEqual(["id", "name", "email"]);
    expect(typeof calledWith[0]?.evaluationId).toBe("string");
  });

  // DoD 7 Test 33: fieldMaskAdapter is NOT called when Allow has no visibleFields
  it("test 33: fieldMaskAdapter.onVisibleFields is NOT called when Allow has no visibleFields", () => {
    const subject = makeSubject(["user:read"]);
    const callCount: number[] = [];

    const result = enforcePolicy({
      policy: hasPermission(ReadUser), // no fields option
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
      fieldMaskAdapter: {
        onVisibleFields(_fields, _evaluationId) {
          callCount.push(1);
        },
      },
    });

    expect(result.isOk()).toBe(true);
    expect(callCount).toHaveLength(0);
  });

  // DoD 7 Test 34: fieldMaskAdapter is NOT called on deny
  it("test 34: fieldMaskAdapter.onVisibleFields is NOT called when the decision is deny", () => {
    const subject = makeSubject([]); // no permissions => deny
    const callCount: number[] = [];

    const result = enforcePolicy({
      policy: hasPermission(ReadUser, { fields: ["id"] }),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
      fieldMaskAdapter: {
        onVisibleFields(_fields, _evaluationId) {
          callCount.push(1);
        },
      },
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);
    expect(callCount).toHaveLength(0);
  });

  // DoD 7 Test 35: fieldMaskAdapter receives evaluationId matching the audit entry
  it("test 35: fieldMaskAdapter receives evaluationId that matches the recorded audit entry", () => {
    const subject = makeSubject(["user:read"]);
    const { trail, entries } = createInMemoryTrail();
    const receivedIds: string[] = [];

    const result = enforcePolicy({
      policy: hasPermission(ReadUser, { fields: ["id", "name"] }),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: false,
      fieldMaskAdapter: {
        onVisibleFields(_fields, evaluationId) {
          receivedIds.push(evaluationId);
        },
      },
    });

    expect(result.isOk()).toBe(true);
    expect(entries).toHaveLength(1);
    expect(receivedIds).toHaveLength(1);
    expect(receivedIds[0]).toBe(entries[0]?.evaluationId);
  });
});
