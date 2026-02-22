import { describe, it, expect } from "vitest";
import { createPolicyChangeAuditEntry } from "../../src/guard/policy-change.js";
import type { PolicyChangeAuditEntry } from "../../src/guard/types.js";
describe("createPolicyChangeAuditEntry — DoD 13 tests 38-45", () => {
  // Test 38: createPolicyChangeAuditEntry() returns an entry with changeType field
  it("test 38: returns an entry with a changeType field", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "create",
      portName: "PolicyPort",
      scopeId: "scope-1",
    });
    expect(entry.changeType).toBeDefined();
    expect(typeof entry.changeType).toBe("string");
  });
  // Test 39: changeType can be create, update, delete, activate, deactivate
  it("test 39: changeType accepts all valid values: create, update, delete, activate, deactivate", () => {
    const changeTypes: PolicyChangeAuditEntry["changeType"][] = ["create", "update", "delete", "activate", "deactivate"];
    for (const changeType of changeTypes) {
      const entry = createPolicyChangeAuditEntry({
        subjectId: "admin-1",
        changeType,
        portName: "PolicyPort",
        scopeId: "scope-1",
      });
      expect(entry.changeType).toBe(changeType);
    }
  });
  // Test 40: PolicyChangeAuditEntry extends AuditEntry (has all AuditEntry fields)
  it("test 40: the returned entry extends AuditEntry — has evaluationId, timestamp, subjectId, decision, schemaVersion", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "update",
      portName: "PolicyPort",
      scopeId: "scope-1",
    });
    // AuditEntry required fields
    expect(typeof entry.evaluationId).toBe("string");
    expect(entry.evaluationId.length).toBeGreaterThan(0);
    expect(typeof entry.timestamp).toBe("string");
    expect(entry.timestamp.length).toBeGreaterThan(0);
    expect(entry.subjectId).toBe("admin-1");
    expect(entry.decision).toBe("allow");
    expect(entry.schemaVersion).toBe(1);
    expect(entry.portName).toBe("PolicyPort");
    expect(entry.scopeId).toBe("scope-1");
  });
  // Test 41: changeControlId is optional
  it("test 41: changeControlId is optional — entry is valid without it", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "update",
      portName: "PolicyPort",
      scopeId: "scope-1",
    });
    expect(entry.changeControlId).toBeUndefined();
  });

  // Test 42: previousPolicyHash is optional
  it("test 42: previousPolicyHash is optional — entry is valid without it", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "update",
      portName: "PolicyPort",
      scopeId: "scope-1",
    });
    expect(entry.previousPolicyHash).toBeUndefined();
  });
  // Test 43: newPolicyHash is optional
  it("test 43: newPolicyHash is optional — entry is valid without it", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "create",
      portName: "PolicyPort",
      scopeId: "scope-1",
    });
    expect(entry.newPolicyHash).toBeUndefined();
  });

  // Test 44: approvedBy is optional
  it("test 44: approvedBy is optional — entry is valid without it", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "activate",
      portName: "PolicyPort",
      scopeId: "scope-1",
    });
    expect(entry.approvedBy).toBeUndefined();
  });
  // Test 44b: optional fields can be provided when present
  it("all optional fields are stored when provided", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "update",
      portName: "PolicyPort",
      scopeId: "scope-1",
      changeControlId: "CCR-2026-001",
      previousPolicyHash: "hash-prev",
      newPolicyHash: "hash-new",
      approvedBy: "qa-lead-1",
    });
    expect(entry.changeControlId).toBe("CCR-2026-001");
    expect(entry.previousPolicyHash).toBe("hash-prev");
    expect(entry.newPolicyHash).toBe("hash-new");
    expect(entry.approvedBy).toBe("qa-lead-1");
  });
  // Test 45: the returned entry is frozen (Object.isFrozen)
  it("test 45: the returned entry is frozen — cannot be mutated", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "delete",
      portName: "PolicyPort",
      scopeId: "scope-1",
    });
    expect(Object.isFrozen(entry)).toBe(true);
  });
});
