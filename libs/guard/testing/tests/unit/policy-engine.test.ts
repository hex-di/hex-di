import { describe, it, expect } from "vitest";
import {
  createMemoryPolicyEngine,
  createStaticSubjectProvider,
  createCyclingSubjectProvider,
} from "../../src/memory/policy-engine.js";
import { createTestSubject } from "../../src/fixtures/subjects.js";
import { hasRole, hasPermission, createPermission } from "@hex-di/guard";

const ReadDoc = createPermission({ resource: "doc", action: "read" });

describe("createMemoryPolicyEngine()", () => {
  it("starts with evaluationCount = 0", () => {
    const engine = createMemoryPolicyEngine();
    expect(engine.evaluationCount).toBe(0);
  });

  it("increments evaluationCount on each call", () => {
    const engine = createMemoryPolicyEngine();
    const subject = createTestSubject({ roles: ["admin"] });
    engine.evaluate(hasRole("admin"), { subject });
    engine.evaluate(hasRole("viewer"), { subject });
    expect(engine.evaluationCount).toBe(2);
  });

  it("delegates evaluation correctly — returns allow for matching role", () => {
    const engine = createMemoryPolicyEngine();
    const subject = createTestSubject({ roles: ["admin"] });
    const result = engine.evaluate(hasRole("admin"), { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("delegates evaluation correctly — returns deny for non-matching role", () => {
    const engine = createMemoryPolicyEngine();
    const subject = createTestSubject({ roles: ["viewer"] });
    const result = engine.evaluate(hasRole("admin"), { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("reset() clears the evaluation count", () => {
    const engine = createMemoryPolicyEngine();
    const subject = createTestSubject();
    engine.evaluate(hasRole("admin"), { subject });
    engine.evaluate(hasRole("viewer"), { subject });
    engine.reset();
    expect(engine.evaluationCount).toBe(0);
  });

  it("continues counting after reset", () => {
    const engine = createMemoryPolicyEngine();
    const subject = createTestSubject();
    engine.evaluate(hasRole("a"), { subject });
    engine.reset();
    engine.evaluate(hasRole("b"), { subject });
    expect(engine.evaluationCount).toBe(1);
  });

  it("evaluates permission policies", () => {
    const engine = createMemoryPolicyEngine();
    const subject = createTestSubject({ permissions: ["doc:read"] });
    const result = engine.evaluate(hasPermission(ReadDoc), { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });
});

describe("createStaticSubjectProvider()", () => {
  it("always returns the same subject", () => {
    const subject = createTestSubject({ roles: ["admin"] });
    const provider = createStaticSubjectProvider(subject);
    expect(provider.getSubject()).toBe(subject);
    expect(provider.getSubject()).toBe(subject);
  });

  it("starts with callCount = 0", () => {
    const subject = createTestSubject();
    const provider = createStaticSubjectProvider(subject);
    expect(provider.callCount).toBe(0);
  });

  it("increments callCount on each getSubject() call", () => {
    const subject = createTestSubject();
    const provider = createStaticSubjectProvider(subject);
    provider.getSubject();
    provider.getSubject();
    provider.getSubject();
    expect(provider.callCount).toBe(3);
  });
});

describe("createCyclingSubjectProvider()", () => {
  it("throws for empty subjects array", () => {
    expect(() => createCyclingSubjectProvider([])).toThrow();
  });

  it("cycles through subjects in order", () => {
    const s1 = createTestSubject({ id: "s1" });
    const s2 = createTestSubject({ id: "s2" });
    const provider = createCyclingSubjectProvider([s1, s2]);
    expect(provider.getSubject()).toBe(s1);
    expect(provider.getSubject()).toBe(s2);
    expect(provider.getSubject()).toBe(s1); // wraps around
  });

  it("starts with callCount = 0 and currentIndex = 0", () => {
    const s = createTestSubject();
    const provider = createCyclingSubjectProvider([s]);
    expect(provider.callCount).toBe(0);
    expect(provider.currentIndex).toBe(0);
  });

  it("increments callCount on each call", () => {
    const s = createTestSubject();
    const provider = createCyclingSubjectProvider([s]);
    provider.getSubject();
    provider.getSubject();
    expect(provider.callCount).toBe(2);
  });

  it("single subject always returns the same subject", () => {
    const s = createTestSubject({ id: "only" });
    const provider = createCyclingSubjectProvider([s]);
    expect(provider.getSubject()).toBe(s);
    expect(provider.getSubject()).toBe(s);
  });
});
