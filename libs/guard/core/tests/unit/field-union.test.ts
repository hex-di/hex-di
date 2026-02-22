import { describe, it, expect } from "vitest";
import { evaluate } from "../../src/evaluator/evaluate.js";
import { mergeVisibleFields } from "../../src/evaluator/evaluate.js";
import { allOf, anyOf, hasPermission } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import type { EvaluationContext } from "../../src/evaluator/evaluate.js";

const readPerm = createPermission({ resource: "doc", action: "read" });
const writePerm = createPermission({ resource: "doc", action: "write" });

function makeAllowContext(_fields?: string[]): EvaluationContext {
  return {
    subject: {
      id: "user-1",
      permissions: new Set(["doc:read", "doc:write"]),
      roles: ["editor"],
      attributes: {},
      authenticationMethod: "password",
      authenticatedAt: new Date().toISOString(),
    },
  };
}

describe("mergeVisibleFields()", () => {
  describe("intersection strategy", () => {
    it("returns undefined when all sets are undefined", () => {
      expect(mergeVisibleFields("intersection", undefined, undefined)).toBeUndefined();
    });

    it("returns the concrete set when one is undefined", () => {
      expect(mergeVisibleFields("intersection", undefined, ["a", "b"])).toEqual(["a", "b"]);
    });

    it("returns intersection of two concrete sets", () => {
      const result = mergeVisibleFields("intersection", ["a", "b", "c"], ["b", "c", "d"]);
      expect(result).toEqual(["b", "c"]);
    });

    it("returns empty array for disjoint sets", () => {
      const result = mergeVisibleFields("intersection", ["a"], ["b"]);
      expect(result).toEqual([]);
    });
  });

  describe("union strategy", () => {
    it("returns undefined when all sets are undefined", () => {
      expect(mergeVisibleFields("union", undefined, undefined)).toBeUndefined();
    });

    it("returns the concrete set when one is undefined", () => {
      const result = mergeVisibleFields("union", undefined, ["a", "b"]);
      expect(result).toContain("a");
      expect(result).toContain("b");
    });

    it("returns union of two concrete sets", () => {
      const result = mergeVisibleFields("union", ["a", "b"], ["b", "c"]);
      expect(result).toContain("a");
      expect(result).toContain("b");
      expect(result).toContain("c");
    });
  });

  describe("first strategy", () => {
    it("returns undefined when all sets are undefined", () => {
      expect(mergeVisibleFields("first", undefined, undefined)).toBeUndefined();
    });

    it("returns the first non-undefined set", () => {
      const result = mergeVisibleFields("first", undefined, ["b", "c"], ["d"]);
      expect(result).toEqual(["b", "c"]);
    });

    it("returns the first set if it is defined", () => {
      const result = mergeVisibleFields("first", ["a"], ["b", "c"]);
      expect(result).toEqual(["a"]);
    });
  });
});

describe("allOf() with fieldStrategy", () => {
  it("uses intersection by default", () => {
    const p1 = hasPermission(readPerm, { fields: ["id", "title", "content"] });
    const p2 = hasPermission(writePerm, { fields: ["id", "title"] });
    const policy = allOf(p1, p2);

    const context = makeAllowContext();
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "allow") {
      expect(result.value.visibleFields).toEqual(["id", "title"]);
    }
  });

  it("uses union strategy when specified", () => {
    const p1 = hasPermission(readPerm, { fields: ["id", "title"] });
    const p2 = hasPermission(writePerm, { fields: ["id", "content"] });
    const policy = allOf(p1, p2, { fieldStrategy: "union" });

    const context = makeAllowContext();
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "allow") {
      expect(result.value.visibleFields).toContain("id");
      expect(result.value.visibleFields).toContain("title");
      expect(result.value.visibleFields).toContain("content");
    }
  });
});

describe("anyOf() with fieldStrategy", () => {
  it("uses first strategy by default (short-circuits)", () => {
    const policy = anyOf(
      hasPermission(readPerm, { fields: ["id", "title"] }),
      hasPermission(writePerm, { fields: ["id", "title", "content"] }),
    );

    const ctx: EvaluationContext = {
      subject: {
        id: "user-1",
        permissions: new Set(["doc:read"]), // only read, not write
        roles: [],
        attributes: {},
        authenticationMethod: "password",
        authenticatedAt: new Date().toISOString(),
      },
    };

    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "allow") {
      // Should use only the first matching policy's fields
      expect(result.value.visibleFields).toEqual(["id", "title"]);
    }
  });

  it("union strategy evaluates ALL children and unions fields", () => {
    const ctx: EvaluationContext = {
      subject: {
        id: "user-1",
        permissions: new Set(["doc:read", "doc:write"]),
        roles: [],
        attributes: {},
        authenticationMethod: "password",
        authenticatedAt: new Date().toISOString(),
      },
    };

    const policy = anyOf(
      hasPermission(readPerm, { fields: ["id", "title"] }),
      hasPermission(writePerm, { fields: ["id", "content"] }),
      { fieldStrategy: "union" },
    );

    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "allow") {
      expect(result.value.visibleFields).toContain("id");
      expect(result.value.visibleFields).toContain("title");
      expect(result.value.visibleFields).toContain("content");
    }
  });

  it("union strategy still denies when no children allow", () => {
    const ctx: EvaluationContext = {
      subject: {
        id: "user-1",
        permissions: new Set(), // no permissions
        roles: [],
        attributes: {},
        authenticationMethod: "password",
        authenticatedAt: new Date().toISOString(),
      },
    };

    const policy = anyOf(
      hasPermission(readPerm, { fields: ["id"] }),
      hasPermission(writePerm, { fields: ["content"] }),
      { fieldStrategy: "union" },
    );

    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("deny");
    }
  });
});

describe("deeply nested allOf(anyOf(...)) field merge", () => {
  it("allOf wrapping anyOf merges fields from inner policy via intersection", () => {
    const ctx: EvaluationContext = {
      subject: {
        id: "user-1",
        permissions: new Set(["doc:read", "doc:write"]),
        roles: [],
        attributes: {},
        authenticationMethod: "password",
        authenticatedAt: new Date().toISOString(),
      },
    };

    // inner anyOf short-circuits on first match: read grants ["id", "title"]
    const innerAnyOf = anyOf(
      hasPermission(readPerm, { fields: ["id", "title"] }),
      hasPermission(writePerm, { fields: ["id", "title", "body"] }),
    );
    // outer allOf intersects with write's fields ["id"]
    const outerAllOf = allOf(
      innerAnyOf,
      hasPermission(writePerm, { fields: ["id"] }),
    );

    const result = evaluate(outerAllOf, ctx);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "allow") {
      // intersection of ["id", "title"] and ["id"] = ["id"]
      expect(result.value.visibleFields).toEqual(["id"]);
    }
  });
});

describe("visibleFields is undefined for policies without fields option", () => {
  it("hasPermission without fields produces undefined visibleFields", () => {
    const ctx = makeAllowContext();
    const result = evaluate(hasPermission(readPerm), ctx);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "allow") {
      expect(result.value.visibleFields).toBeUndefined();
    }
  });

  it("allOf of fieldless policies produces undefined visibleFields", () => {
    const ctx = makeAllowContext();
    const policy = allOf(hasPermission(readPerm), hasPermission(writePerm));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "allow") {
      expect(result.value.visibleFields).toBeUndefined();
    }
  });
});
