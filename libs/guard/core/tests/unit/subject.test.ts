import { describe, it, expect } from "vitest";
import {
  createAuthSubject,
  withAttributes,
  getAttribute,
} from "../../src/subject/auth-subject.js";

describe("createAuthSubject()", () => {
  it("creates a valid subject", () => {
    const subject = createAuthSubject("user-1", ["viewer"], new Set(["user:read"]));
    expect(subject.id).toBe("user-1");
    expect(subject.roles).toContain("viewer");
    expect(subject.permissions.has("user:read")).toBe(true);
  });

  it("is frozen", () => {
    const subject = createAuthSubject("user-1", [], new Set());
    expect(Object.isFrozen(subject)).toBe(true);
  });

  it("defaults authenticationMethod to 'password'", () => {
    const subject = createAuthSubject("user-1", [], new Set());
    expect(subject.authenticationMethod).toBe("password");
  });

  it("defaults authenticatedAt to a recent ISO string", () => {
    const before = new Date().toISOString();
    const subject = createAuthSubject("user-1", [], new Set());
    const after = new Date().toISOString();
    expect(subject.authenticatedAt >= before).toBe(true);
    expect(subject.authenticatedAt <= after).toBe(true);
  });

  it("accepts custom authenticationMethod", () => {
    const subject = createAuthSubject(
      "user-1",
      [],
      new Set(),
      {},
      "mfa",
      "2026-01-01T00:00:00.000Z",
    );
    expect(subject.authenticationMethod).toBe("mfa");
    expect(subject.authenticatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("stores attributes", () => {
    const subject = createAuthSubject(
      "user-1",
      [],
      new Set(),
      { department: "engineering" },
    );
    expect(subject.attributes["department"]).toBe("engineering");
  });
});

describe("withAttributes()", () => {
  it("merges new attributes with existing ones", () => {
    const original = createAuthSubject("user-1", [], new Set(), { a: 1 });
    const updated = withAttributes(original, { b: 2 });
    expect(updated.attributes["a"]).toBe(1);
    expect(updated.attributes["b"]).toBe(2);
  });

  it("overrides existing attributes", () => {
    const original = createAuthSubject("user-1", [], new Set(), { key: "old" });
    const updated = withAttributes(original, { key: "new" });
    expect(updated.attributes["key"]).toBe("new");
  });

  it("does not mutate the original subject", () => {
    const original = createAuthSubject("user-1", [], new Set(), { a: 1 });
    withAttributes(original, { b: 2 });
    expect(original.attributes["b"]).toBeUndefined();
  });

  it("preserves all other subject fields", () => {
    const original = createAuthSubject("user-1", ["admin"], new Set(["user:read"]), {});
    const updated = withAttributes(original, { x: 1 });
    expect(updated.id).toBe("user-1");
    expect(updated.roles).toContain("admin");
    expect(updated.permissions.has("user:read")).toBe(true);
  });
});

describe("getAttribute()", () => {
  it("returns the attribute value", () => {
    const subject = createAuthSubject("user-1", [], new Set(), { tier: "gold" });
    expect(getAttribute(subject, "tier")).toBe("gold");
  });

  it("returns undefined for missing attribute", () => {
    const subject = createAuthSubject("user-1", [], new Set());
    expect(getAttribute(subject, "missing")).toBeUndefined();
  });

  it("returns nested object value", () => {
    const nested = { address: { city: "Berlin", zip: "10115" } };
    const subject = createAuthSubject("user-1", [], new Set(), nested);
    const addr = getAttribute(subject, "address");
    expect(addr).toEqual({ city: "Berlin", zip: "10115" });
  });
});

describe("createAuthSubject() — optional fields", () => {
  it("supports optional sessionId", () => {
    // sessionId is not a constructor parameter, but the AuthSubject interface allows it
    const subject = createAuthSubject("user-1", [], new Set());
    expect(subject.sessionId).toBeUndefined();
  });

  it("supports optional identityProvider", () => {
    const subject = createAuthSubject("user-1", [], new Set());
    expect(subject.identityProvider).toBeUndefined();
  });

  it("permissions is ReadonlySet", () => {
    const perms = new Set(["doc:read", "doc:write"]);
    const subject = createAuthSubject("user-1", [], perms);
    expect(subject.permissions.has("doc:read")).toBe(true);
    expect(subject.permissions.has("doc:write")).toBe(true);
    expect(subject.permissions.size).toBe(2);
  });

  it("roles array is frozen", () => {
    const subject = createAuthSubject("user-1", ["admin", "viewer"], new Set());
    expect(Object.isFrozen(subject.roles)).toBe(true);
  });
});

describe("withAttributes() — immutability", () => {
  it("returns a frozen subject", () => {
    const original = createAuthSubject("user-1", [], new Set(), { a: 1 });
    const updated = withAttributes(original, { b: 2 });
    expect(Object.isFrozen(updated)).toBe(true);
    expect(Object.isFrozen(updated.attributes)).toBe(true);
  });
});
