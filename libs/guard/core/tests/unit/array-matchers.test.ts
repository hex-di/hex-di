import { describe, it, expect } from "vitest";
import { evaluate } from "../../src/evaluator/evaluate.js";
import {
  hasAttribute,
  hasResourceAttribute,
} from "../../src/policy/combinators.js";
import {
  someMatch,
  contains,
  everyMatch,
  size,
  eq,
  gte,
  lt,
  literal,
  exists,
  inArray,
} from "../../src/policy/matchers.js";
import { createAuthSubject } from "../../src/subject/auth-subject.js";

function makeSubject(attrs: Record<string, unknown> = {}) {
  return createAuthSubject("user-1", [], new Set(), attrs);
}

describe("someMatch matcher — via hasAttribute", () => {
  it("allows when at least one element matches", () => {
    const subject = makeSubject({ tags: ["admin", "user"] });
    const policy = hasAttribute("tags", someMatch(eq(literal("admin"))));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("denies when no element matches", () => {
    const subject = makeSubject({ tags: ["user", "viewer"] });
    const policy = hasAttribute("tags", someMatch(eq(literal("admin"))));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("denies when attribute is not an array", () => {
    const subject = makeSubject({ tags: "admin" });
    const policy = hasAttribute("tags", someMatch(eq(literal("admin"))));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("denies when attribute is empty array", () => {
    const subject = makeSubject({ tags: [] });
    const policy = hasAttribute("tags", someMatch(eq(literal("admin"))));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });
});

describe("contains matcher — via hasAttribute", () => {
  it("allows when array contains the value", () => {
    const subject = makeSubject({ roles: ["admin", "user"] });
    const policy = hasAttribute("roles", contains("admin"));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("denies when array does not contain the value", () => {
    const subject = makeSubject({ roles: ["user"] });
    const policy = hasAttribute("roles", contains("admin"));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("allows when string contains the substring", () => {
    const subject = makeSubject({ email: "alice@admin.com" });
    const policy = hasAttribute("email", contains("@admin"));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });
});

describe("everyMatch matcher — via hasAttribute", () => {
  it("allows when all elements match", () => {
    const subject = makeSubject({ scores: [5, 10, 15] });
    const policy = hasAttribute("scores", everyMatch(gte(5)));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("denies when any element does not match", () => {
    const subject = makeSubject({ scores: [5, 3, 15] });
    const policy = hasAttribute("scores", everyMatch(gte(5)));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("allows for empty array (vacuous truth)", () => {
    const subject = makeSubject({ items: [] });
    const policy = hasAttribute("items", everyMatch(exists()));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    // everyMatch on empty array vacuously returns true
    expect(result.value.kind).toBe("allow");
  });
});

describe("size matcher — via hasAttribute", () => {
  it("allows when array size matches gte constraint", () => {
    const subject = makeSubject({ items: [1, 2, 3] });
    const policy = hasAttribute("items", size(gte(2)));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("denies when array size does not match", () => {
    const subject = makeSubject({ items: [1] });
    const policy = hasAttribute("items", size(gte(2)));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("works with string length", () => {
    const subject = makeSubject({ code: "AB123" });
    const policy = hasAttribute("code", size(lt(10)));
    const result = evaluate(policy, { subject });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("inArray works with hasResourceAttribute", () => {
    const subject = makeSubject();
    const policy = hasResourceAttribute("status", inArray(["active", "pending"]));
    const resource = { status: "active" };
    const result = evaluate(policy, { subject, resource });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });
});
