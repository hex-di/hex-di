import { describe, it, expect, beforeAll } from "vitest";
import { setupGuardMatchers } from "../../src/matchers/setup.js";
import { createTestSubject, adminSubject, readerSubject, anonymousSubject } from "../../src/fixtures/subjects.js";
import { createMemoryPolicyEngine } from "../../src/memory/policy-engine.js";
import { hasRole, hasPermission, createPermission } from "@hex-di/guard";

beforeAll(() => {
  setupGuardMatchers();
});

const ReadDoc = createPermission({ resource: "doc", action: "read" });

describe("setupGuardMatchers — toAllowPolicy / toDenyPolicy (legacy)", () => {
  it("toAllowPolicy passes when policy allows", () => {
    const subject = createTestSubject({ roles: ["admin"] });
    expect({}).toAllowPolicy(hasRole("admin"), subject);
  });

  it("toDenyPolicy passes when policy denies", () => {
    const subject = createTestSubject({ roles: ["viewer"] });
    expect({}).toDenyPolicy(hasRole("admin"), subject);
  });
});

describe("setupGuardMatchers — toAllow / toDeny (new)", () => {
  it("toAllow passes when policy allows subject", () => {
    const subject = createTestSubject({ roles: ["admin"] });
    expect(hasRole("admin")).toAllow(subject);
  });

  it("toDeny passes when policy denies subject", () => {
    const subject = createTestSubject({ roles: ["viewer"] });
    expect(hasRole("admin")).toDeny(subject);
  });

  it("toAllow uses adminSubject archetype", () => {
    expect(hasRole("admin")).toAllow(adminSubject);
  });

  it("toDeny uses anonymousSubject archetype", () => {
    expect(hasRole("admin")).toDeny(anonymousSubject);
  });

  it("toAllow works for permission policy", () => {
    const subject = createTestSubject({ permissions: ["doc:read"] });
    expect(hasPermission(ReadDoc)).toAllow(subject);
  });

  it("toDeny works for permission policy", () => {
    expect(hasPermission(ReadDoc)).toDeny(readerSubject);
  });
});

describe("setupGuardMatchers — toDenyWith", () => {
  it("passes when policy denies with matching reason substring", () => {
    const subject = createTestSubject({ roles: [] });
    expect(hasRole("admin")).toDenyWith(subject, "admin");
  });

  it("fails when policy denies but reason does not match", () => {
    const subject = createTestSubject({ roles: [] });
    // Should throw because reason "admin" does not include "xyz"
    expect(() => {
      expect(hasRole("admin")).toDenyWith(subject, "xyz");
    }).toThrow();
  });
});

describe("setupGuardMatchers — toHaveEvaluated", () => {
  it("passes when engine evaluated exact count", () => {
    const engine = createMemoryPolicyEngine();
    const subject = createTestSubject();
    engine.evaluate(hasRole("admin"), { subject });
    engine.evaluate(hasRole("viewer"), { subject });
    expect(engine).toHaveEvaluated(2);
  });

  it("passes when count is 0 on fresh engine", () => {
    const engine = createMemoryPolicyEngine();
    expect(engine).toHaveEvaluated(0);
  });

  it("fails when count does not match", () => {
    const engine = createMemoryPolicyEngine();
    const subject = createTestSubject();
    engine.evaluate(hasRole("admin"), { subject });
    expect(() => {
      expect(engine).toHaveEvaluated(5);
    }).toThrow();
  });
});

describe("subject archetypes", () => {
  it("adminSubject has admin role", () => {
    expect(adminSubject.roles).toContain("admin");
    expect(adminSubject.id).toBe("admin-subject");
  });

  it("readerSubject has reader role", () => {
    expect(readerSubject.roles).toContain("reader");
  });

  it("anonymousSubject has no roles", () => {
    expect(anonymousSubject.roles).toHaveLength(0);
    expect(anonymousSubject.permissions.size).toBe(0);
  });

  it("all archetypes are frozen", () => {
    expect(Object.isFrozen(adminSubject)).toBe(true);
    expect(Object.isFrozen(readerSubject)).toBe(true);
    expect(Object.isFrozen(anonymousSubject)).toBe(true);
  });
});
