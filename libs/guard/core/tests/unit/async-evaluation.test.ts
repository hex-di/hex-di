import { describe, it, expect, vi } from "vitest";
import { evaluateAsync } from "../../src/evaluator/async.js";
import type { AttributeResolver } from "../../src/evaluator/async.js";
import { hasAttribute, hasPermission, allOf, anyOf } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import type { EvaluationContext } from "../../src/evaluator/evaluate.js";
import { ACL018, ACL026 } from "../../src/errors/codes.js";

function makeContext(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    subject: {
      id: "user-1",
      permissions: new Set(),
      roles: [],
      attributes: {},
      authenticationMethod: "password",
      authenticatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

const staticResolver: AttributeResolver = {
  async resolve(subjectId, attribute): Promise<unknown> {
    if (attribute === "department") return "engineering";
    if (attribute === "level") return 5;
    return undefined;
  },
};

describe("evaluateAsync()", () => {
  it("resolves subject attributes before evaluating", async () => {
    const policy = hasAttribute("department", { kind: "eq", ref: { kind: "literal", value: "engineering" } });
    const context = makeContext();
    const result = await evaluateAsync(policy, context, staticResolver);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("allow");
    }
  });

  it("denies when resolved attribute does not match", async () => {
    const policy = hasAttribute("department", { kind: "eq", ref: { kind: "literal", value: "marketing" } });
    const context = makeContext();
    const result = await evaluateAsync(policy, context, staticResolver);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("deny");
    }
  });

  it("captures evaluatedAt BEFORE async resolution", async () => {
    const timings: number[] = [];

    const slowResolver: AttributeResolver = {
      async resolve(): Promise<unknown> {
        await new Promise((r) => setTimeout(r, 20));
        timings.push(Date.now());
        return "engineering";
      },
    };

    const beforeCall = Date.now();
    const policy = hasAttribute("department", { kind: "exists" });
    const context = makeContext();
    const result = await evaluateAsync(policy, context, slowResolver);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const evaluatedAt = new Date(result.value.evaluatedAt).getTime();
      // evaluatedAt should be at or before the async resolution completed
      expect(evaluatedAt).toBeGreaterThanOrEqual(beforeCall - 5); // small tolerance
      expect(timings[0]).toBeGreaterThanOrEqual(evaluatedAt);
    }
  });

  it("returns AttributeResolveTimeoutError (ACL026) when resolution times out", async () => {
    const slowResolver: AttributeResolver = {
      async resolve(): Promise<unknown> {
        await new Promise((r) => setTimeout(r, 200));
        return "done";
      },
    };

    const policy = hasAttribute("department", { kind: "exists" });
    const context = makeContext();
    const result = await evaluateAsync(policy, context, slowResolver, { resolverTimeoutMs: 50 });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe(ACL026);
    }
  }, 3000);

  it("merges already-set subject attributes with resolved ones", async () => {
    const policy = allOf(
      hasAttribute("existing", { kind: "eq", ref: { kind: "literal", value: "yes" } }),
      hasAttribute("department", { kind: "eq", ref: { kind: "literal", value: "engineering" } }),
    );
    const context = makeContext({
      subject: {
        id: "user-1",
        permissions: new Set(),
        roles: [],
        attributes: { existing: "yes" },
        authenticationMethod: "password",
        authenticatedAt: new Date().toISOString(),
      },
    });
    const result = await evaluateAsync(policy, context, staticResolver);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("allow");
    }
  });

  it("does not call resolver when no dynamic attributes are needed", async () => {
    const resolveSpy = vi.fn().mockResolvedValue("value");
    const resolver: AttributeResolver = { resolve: resolveSpy };
    const perm = createPermission({ resource: "doc", action: "read" });
    const policy = hasPermission(perm);
    const context = makeContext({
      subject: {
        id: "user-1",
        permissions: new Set(["doc:read"]),
        roles: [],
        attributes: {},
        authenticationMethod: "password",
        authenticatedAt: new Date().toISOString(),
      },
    });
    const result = await evaluateAsync(policy, context, resolver);
    expect(result.isOk()).toBe(true);
    // resolver should not be called for hasPermission policies
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  it("resolver error propagation returns ACL018", async () => {
    const failingResolver: AttributeResolver = {
      async resolve(): Promise<unknown> {
        throw new Error("LDAP connection failed");
      },
    };

    const policy = hasAttribute("department", { kind: "exists" });
    const context = makeContext();
    const result = await evaluateAsync(policy, context, failingResolver);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe(ACL018);
    }
  });

  it("per-pass attribute caching: same attr resolved once", async () => {
    let resolveCount = 0;
    const countingResolver: AttributeResolver = {
      async resolve(_subjectId, attribute): Promise<unknown> {
        resolveCount++;
        if (attribute === "department") return "engineering";
        return undefined;
      },
    };

    // allOf uses department in both children, but it should only be resolved once
    const policy = allOf(
      hasAttribute("department", { kind: "eq", ref: { kind: "literal", value: "engineering" } }),
      hasAttribute("department", { kind: "exists" }),
    );
    const context = makeContext();
    await evaluateAsync(policy, context, countingResolver);
    // department should only be resolved once (deduped by collectAttributeNames)
    expect(resolveCount).toBe(1);
  });

  it("resolver returns undefined → treated as absent attribute", async () => {
    const undefinedResolver: AttributeResolver = {
      async resolve(): Promise<unknown> {
        return undefined;
      },
    };

    const policy = hasAttribute("missing_attr", { kind: "exists" });
    const context = makeContext();
    const result = await evaluateAsync(policy, context, undefinedResolver);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // undefined attribute doesn't satisfy "exists" check
      expect(result.value.kind).toBe("deny");
    }
  });

  it("timeout handling: fast resolver beats timeout", async () => {
    const fastResolver: AttributeResolver = {
      async resolve(): Promise<unknown> {
        return "fast-value";
      },
    };

    const policy = hasAttribute("department", { kind: "exists" });
    const context = makeContext();
    const result = await evaluateAsync(policy, context, fastResolver, { resolverTimeoutMs: 5000 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("allow");
    }
  });

  it("multiple attribute names from nested policy tree", async () => {
    const resolvedAttrs: string[] = [];
    const trackingResolver: AttributeResolver = {
      async resolve(_subjectId, attribute): Promise<unknown> {
        resolvedAttrs.push(attribute);
        if (attribute === "department") return "engineering";
        if (attribute === "clearance") return "secret";
        return undefined;
      },
    };

    const policy = anyOf(
      hasAttribute("department", { kind: "exists" }),
      hasAttribute("clearance", { kind: "exists" }),
    );
    const context = makeContext();
    await evaluateAsync(policy, context, trackingResolver);
    // Both attributes should have been resolved
    expect(resolvedAttrs).toContain("department");
    expect(resolvedAttrs).toContain("clearance");
  });
});
