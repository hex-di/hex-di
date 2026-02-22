import { describe, it, expect } from "vitest";
import {
  subject,
  resource,
  literal,
  eq,
  neq,
  inArray,
  exists,
  fieldMatch,
  gte,
  lt,
  someMatch,
  contains,
  everyMatch,
  size,
} from "../../src/policy/matchers.js";

describe("matcher builders", () => {
  it("subject() creates subject ref", () => {
    const ref = subject("id");
    expect(ref.kind).toBe("subject");
    expect(ref.path).toBe("id");
  });

  it("resource() creates resource ref", () => {
    const ref = resource("status");
    expect(ref.kind).toBe("resource");
    expect(ref.path).toBe("status");
  });

  it("literal() creates literal ref", () => {
    const ref = literal("active");
    expect(ref.kind).toBe("literal");
    expect(ref.value).toBe("active");
  });

  it("eq() creates eq matcher", () => {
    const m = eq(literal("x"));
    expect(m.kind).toBe("eq");
    expect(m.ref).toEqual(literal("x"));
  });

  it("neq() creates neq matcher", () => {
    const m = neq(literal("y"));
    expect(m.kind).toBe("neq");
  });

  it("inArray() creates in matcher", () => {
    const m = inArray(["a", "b", "c"]);
    expect(m.kind).toBe("in");
    expect(m.values).toEqual(["a", "b", "c"]);
  });

  it("exists() creates exists matcher", () => {
    const m = exists();
    expect(m.kind).toBe("exists");
  });

  it("fieldMatch() creates fieldMatch matcher", () => {
    const m = fieldMatch("name", eq(literal("Alice")));
    expect(m.kind).toBe("fieldMatch");
    expect(m.field).toBe("name");
  });

  it("gte() creates gte matcher", () => {
    const m = gte(18);
    expect(m.kind).toBe("gte");
    expect(m.value).toBe(18);
  });

  it("lt() creates lt matcher", () => {
    const m = lt(100);
    expect(m.kind).toBe("lt");
    expect(m.value).toBe(100);
  });

  it("someMatch() creates someMatch matcher", () => {
    const m = someMatch(eq(literal("admin")));
    expect(m.kind).toBe("someMatch");
  });

  it("contains() creates contains matcher", () => {
    const m = contains("admin");
    expect(m.kind).toBe("contains");
    expect(m.value).toBe("admin");
  });

  it("everyMatch() creates everyMatch matcher", () => {
    const m = everyMatch(exists());
    expect(m.kind).toBe("everyMatch");
  });

  it("size() creates size matcher", () => {
    const m = size(gte(1));
    expect(m.kind).toBe("size");
  });

  it("all matcher objects are frozen", () => {
    expect(Object.isFrozen(eq(literal("x")))).toBe(true);
    expect(Object.isFrozen(inArray([1, 2, 3]))).toBe(true);
  });
});
