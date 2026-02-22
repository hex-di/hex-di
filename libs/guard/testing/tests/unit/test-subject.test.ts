import { describe, it, expect, beforeEach } from "vitest";
import { createTestSubject, resetSubjectCounter } from "../../src/fixtures/subjects.js";

describe("createTestSubject()", () => {
  beforeEach(() => {
    resetSubjectCounter();
  });

  it("creates a subject with default id when no id provided", () => {
    const subject = createTestSubject();
    expect(subject.id).toBe("test-user-1");
  });

  it("auto-increments the counter", () => {
    const s1 = createTestSubject();
    const s2 = createTestSubject();
    expect(s1.id).toBe("test-user-1");
    expect(s2.id).toBe("test-user-2");
  });

  it("uses provided id when given", () => {
    const subject = createTestSubject({ id: "custom-id" });
    expect(subject.id).toBe("custom-id");
  });

  it("defaults roles to empty array", () => {
    const subject = createTestSubject();
    expect(subject.roles).toEqual([]);
  });

  it("includes provided roles", () => {
    const subject = createTestSubject({ roles: ["admin", "viewer"] });
    expect(subject.roles).toEqual(["admin", "viewer"]);
  });

  it("defaults permissions to empty Set", () => {
    const subject = createTestSubject();
    expect(subject.permissions.size).toBe(0);
  });

  it("includes provided permissions", () => {
    const subject = createTestSubject({ permissions: ["user:read", "user:write"] });
    expect(subject.permissions.has("user:read")).toBe(true);
    expect(subject.permissions.has("user:write")).toBe(true);
  });

  it("defaults authenticationMethod to 'password'", () => {
    const subject = createTestSubject();
    expect(subject.authenticationMethod).toBe("password");
  });

  it("allows custom authenticationMethod", () => {
    const subject = createTestSubject({ authenticationMethod: "sso" });
    expect(subject.authenticationMethod).toBe("sso");
  });

  it("defaults attributes to empty object", () => {
    const subject = createTestSubject();
    expect(subject.attributes).toEqual({});
  });

  it("includes provided attributes", () => {
    const subject = createTestSubject({ attributes: { department: "eng" } });
    expect(subject.attributes["department"]).toBe("eng");
  });
});

describe("resetSubjectCounter()", () => {
  it("resets the counter so ids start from 1 again", () => {
    resetSubjectCounter();
    const s1 = createTestSubject();
    resetSubjectCounter();
    const s2 = createTestSubject();
    expect(s1.id).toBe("test-user-1");
    expect(s2.id).toBe("test-user-1");
  });
});
