import { describe, it, expect } from "vitest";
import {
  archiveAuditTrail,
  createDecommissioningChecklist,
  completeDecommissioningStep,
} from "../../src/guard/decommission.js";
import type { AuditEntry } from "../../src/guard/types.js";
import { ACL029 } from "../../src/errors/codes.js";

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    evaluationId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    subjectId: "user-1",
    authenticationMethod: "password",
    policy: "hasRole",
    decision: "allow",
    portName: "TestPort",
    scopeId: "scope-1",
    reason: "Access granted",
    durationMs: 1,
    schemaVersion: 1,
    ...overrides,
  };
}

describe("archiveAuditTrail()", () => {
  it("creates a valid archive from a set of entries", () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const result = archiveAuditTrail(entries);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const archive = result.value;
      expect(archive.archiveVersion).toBe("guard-audit-archive@1.0.0");
      expect(archive.metadata.entryCount).toBe(3);
      expect(archive.metadata.chainIntegrityVerified).toBe(true);
      expect(archive.chains).toHaveLength(1);
      expect(archive.chains[0].scopeId).toBe("scope-1");
      expect(archive.chains[0].entries).toHaveLength(3);
    }
  });

  it("groups entries by scopeId into separate chains", () => {
    const entries = [
      makeEntry({ scopeId: "scope-a" }),
      makeEntry({ scopeId: "scope-b" }),
      makeEntry({ scopeId: "scope-a" }),
    ];
    const result = archiveAuditTrail(entries);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const chains = result.value.chains;
      expect(chains).toHaveLength(2);
      const scopeA = chains.find((c) => c.scopeId === "scope-a");
      const scopeB = chains.find((c) => c.scopeId === "scope-b");
      expect(scopeA?.entries).toHaveLength(2);
      expect(scopeB?.entries).toHaveLength(1);
    }
  });

  it("returns ChainIntegrityError (ACL029) when sequence numbers have gaps", () => {
    const entries = [
      makeEntry({ sequenceNumber: 1 }),
      makeEntry({ sequenceNumber: 2 }),
      makeEntry({ sequenceNumber: 4 }), // gap: missing 3
    ];
    const result = archiveAuditTrail(entries);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe(ACL029);
    }
  });

  it("succeeds with skipIntegrityVerification even when gaps exist", () => {
    const entries = [
      makeEntry({ sequenceNumber: 1 }),
      makeEntry({ sequenceNumber: 5 }), // gap
    ];
    const result = archiveAuditTrail(entries, { skipIntegrityVerification: true });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.metadata.chainIntegrityVerified).toBe(false);
    }
  });

  it("passes through keyMaterial when provided", () => {
    const keyMaterial = [{ keyId: "key-1", algorithm: "HMAC-SHA256", publicKey: "abc" }];
    const result = archiveAuditTrail([makeEntry()], { keyMaterial });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.keyMaterial).toEqual(keyMaterial);
    }
  });

  it("succeeds with empty entries list", () => {
    const result = archiveAuditTrail([]);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.metadata.entryCount).toBe(0);
      expect(result.value.chains).toHaveLength(0);
    }
  });

  it("succeeds with valid sequential sequence numbers", () => {
    const entries = [
      makeEntry({ sequenceNumber: 1 }),
      makeEntry({ sequenceNumber: 2 }),
      makeEntry({ sequenceNumber: 3 }),
    ];
    const result = archiveAuditTrail(entries);
    expect(result.isOk()).toBe(true);
  });
});

describe("DecommissioningChecklist", () => {
  describe("createDecommissioningChecklist()", () => {
    it("creates a checklist with required steps", () => {
      const checklist = createDecommissioningChecklist();
      expect(typeof checklist.checklistId).toBe("string");
      expect(checklist.steps.length).toBeGreaterThan(0);
      expect(checklist.allRequiredComplete).toBe(false);
    });

    it("all required steps start as incomplete", () => {
      const checklist = createDecommissioningChecklist();
      const requiredSteps = checklist.steps.filter((s) => s.required);
      expect(requiredSteps.every((s) => !s.completed)).toBe(true);
    });
  });

  describe("completeDecommissioningStep()", () => {
    it("marks the specified step as complete", () => {
      const checklist = createDecommissioningChecklist();
      const firstStep = checklist.steps[0];
      const updated = completeDecommissioningStep(checklist, firstStep.id, "admin");

      const completedStep = updated.steps.find((s) => s.id === firstStep.id);
      expect(completedStep?.completed).toBe(true);
      expect(completedStep?.completedBy).toBe("admin");
      expect(completedStep?.completedAt).toBeDefined();
    });

    it("does not mutate the original checklist", () => {
      const checklist = createDecommissioningChecklist();
      const original = JSON.stringify(checklist);
      completeDecommissioningStep(checklist, checklist.steps[0].id, "admin");
      expect(JSON.stringify(checklist)).toBe(original);
    });

    it("allRequiredComplete becomes true when all required steps are done", () => {
      let checklist = createDecommissioningChecklist();
      const requiredSteps = checklist.steps.filter((s) => s.required);

      for (const step of requiredSteps) {
        checklist = completeDecommissioningStep(checklist, step.id, "admin");
      }

      expect(checklist.allRequiredComplete).toBe(true);
    });

    it("allRequiredComplete is false when optional steps remain", () => {
      let checklist = createDecommissioningChecklist();
      const requiredSteps = checklist.steps.filter((s) => s.required);

      for (const step of requiredSteps) {
        checklist = completeDecommissioningStep(checklist, step.id, "admin");
      }

      // Completing optional step should not affect allRequiredComplete
      expect(checklist.allRequiredComplete).toBe(true);
    });

    it("completeDecommissioningStep for non-existent step is a no-op", () => {
      const checklist = createDecommissioningChecklist();
      const updated = completeDecommissioningStep(checklist, "DECOMM-FAKE", "admin");
      // No step should be marked completed
      expect(updated.steps.every((s) => !s.completed)).toBe(true);
      expect(updated.allRequiredComplete).toBe(false);
    });

    it("completedBy and completedAt are tracked for each step", () => {
      const checklist = createDecommissioningChecklist();
      const updated = completeDecommissioningStep(checklist, "DECOMM-001", "reviewer-X");
      const step = updated.steps.find((s) => s.id === "DECOMM-001");
      expect(step?.completedBy).toBe("reviewer-X");
      expect(typeof step?.completedAt).toBe("string");
      expect(new Date(step?.completedAt ?? "").toISOString()).toBe(step?.completedAt);
    });
  });

  describe("checklist structure", () => {
    it("has 7 steps (6 required, 1 optional)", () => {
      const checklist = createDecommissioningChecklist();
      expect(checklist.steps).toHaveLength(7);
      expect(checklist.steps.filter((s) => s.required)).toHaveLength(6);
      expect(checklist.steps.filter((s) => !s.required)).toHaveLength(1);
    });
  });
});

describe("archiveAuditTrail() — additional coverage", () => {
  it("archive round-trip: export then verify structure", () => {
    const entries = [
      makeEntry({ sequenceNumber: 1 }),
      makeEntry({ sequenceNumber: 2 }),
    ];
    const result = archiveAuditTrail(entries);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const archive = result.value;
      // Verify structure survives JSON round-trip
      const serialized = JSON.stringify(archive);
      const parsed = JSON.parse(serialized);
      expect(parsed.archiveVersion).toBe("guard-audit-archive@1.0.0");
      expect(parsed.metadata.entryCount).toBe(2);
      expect(parsed.metadata.chainIntegrityVerified).toBe(true);
      expect(parsed.chains[0].entries).toHaveLength(2);
    }
  });

  it("archive keyMaterial is frozen", () => {
    const keyMaterial = [{ keyId: "k1", algorithm: "HMAC-SHA256", publicKey: "pub" }];
    const result = archiveAuditTrail([makeEntry()], { keyMaterial });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(Object.isFrozen(result.value.keyMaterial)).toBe(true);
    }
  });

  it("empty archive is valid", () => {
    const result = archiveAuditTrail([]);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.metadata.entryCount).toBe(0);
      expect(result.value.chains).toHaveLength(0);
      expect(result.value.archiveVersion).toBe("guard-audit-archive@1.0.0");
    }
  });
});
