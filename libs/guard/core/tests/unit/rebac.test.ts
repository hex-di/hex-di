import { describe, it, expect } from "vitest";
import { evaluate } from "../../src/evaluator/evaluate.js";
import { hasRelationship } from "../../src/policy/combinators.js";
import type { RelationshipResolver } from "../../src/evaluator/rebac.js";
import { NoopRelationshipResolver } from "../../src/evaluator/rebac.js";
import type { EvaluationContext } from "../../src/evaluator/evaluate.js";

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

const allowingResolver: RelationshipResolver = {
  check(): boolean {
    return true;
  },
  async checkAsync(): Promise<boolean> {
    return true;
  },
};

const denyingResolver: RelationshipResolver = {
  check(): boolean {
    return false;
  },
  async checkAsync(): Promise<boolean> {
    return false;
  },
};

describe("hasRelationship policy evaluation", () => {
  it("denies when no resource.id in context", () => {
    const policy = hasRelationship("owner");
    const context = makeContext({ relationshipResolver: allowingResolver });
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("deny");
      expect(result.value.kind === "deny" && result.value.reason).toContain("ACL030");
    }
  });

  it("denies when RelationshipResolverPort is not wired", () => {
    const policy = hasRelationship("owner");
    const context = makeContext({ resource: { id: "doc-1" } });
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("deny");
      expect(result.value.kind === "deny" && result.value.reason).toContain("ACL028");
    }
  });

  it("allows when resolver.check() returns true", () => {
    const policy = hasRelationship("owner");
    const context = makeContext({
      resource: { id: "doc-1" },
      relationshipResolver: allowingResolver,
    });
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("allow");
    }
  });

  it("denies when resolver.check() returns false", () => {
    const policy = hasRelationship("editor");
    const context = makeContext({
      resource: { id: "doc-2" },
      relationshipResolver: denyingResolver,
    });
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("deny");
    }
  });

  it("passes fields when allowed", () => {
    const policy = hasRelationship("viewer", { fields: ["title", "content"] });
    const context = makeContext({
      resource: { id: "doc-3" },
      relationshipResolver: allowingResolver,
    });
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "allow") {
      expect(result.value.visibleFields).toEqual(["title", "content"]);
    }
  });

  it("passes depth option to resolver.check()", () => {
    let capturedDepth: number | undefined;
    const resolver: RelationshipResolver = {
      check(_sub, _rel, _res, opts): boolean {
        capturedDepth = opts?.depth;
        return true;
      },
      async checkAsync(): Promise<boolean> {
        return true;
      },
    };

    const policy = hasRelationship("member", { depth: 3 });
    const context = makeContext({
      resource: { id: "group-1" },
      relationshipResolver: resolver,
    });
    evaluate(policy, context);
    expect(capturedDepth).toBe(3);
  });

  it("NoopRelationshipResolver always returns false", () => {
    expect(NoopRelationshipResolver.check("u", "r", "res")).toBe(false);
  });

  it("NoopRelationshipResolver.checkAsync() always returns false", async () => {
    const result = await NoopRelationshipResolver.checkAsync("u", "r", "res");
    expect(result).toBe(false);
  });

  it("denies with ACL022 message when resolver throws", () => {
    const throwingResolver: RelationshipResolver = {
      check(): boolean {
        throw new Error("database unavailable");
      },
      async checkAsync(): Promise<boolean> {
        return false;
      },
    };
    const policy = hasRelationship("owner");
    const context = makeContext({
      resource: { id: "doc-4" },
      relationshipResolver: throwingResolver,
    });
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("deny");
      expect(result.value.kind === "deny" && result.value.reason).toContain("ACL022");
    }
  });

  it("async relationship check: allowing resolver permits", async () => {
    const result = await allowingResolver.checkAsync("user-1", "owner", "doc-1");
    expect(result).toBe(true);
  });

  it("async relationship check: denying resolver blocks", async () => {
    const result = await denyingResolver.checkAsync("user-1", "editor", "doc-2");
    expect(result).toBe(false);
  });

  it("depth option forwarded to resolver.check", () => {
    let receivedOpts: { readonly depth?: number } | undefined;
    const resolver: RelationshipResolver = {
      check(_sub, _rel, _res, opts): boolean {
        receivedOpts = opts;
        return true;
      },
      checkAsync(): Promise<boolean> {
        return Promise.resolve(true);
      },
    };

    const policy = hasRelationship("admin", { depth: 5 });
    const context = makeContext({
      resource: { id: "org-1" },
      relationshipResolver: resolver,
    });
    evaluate(policy, context);
    expect(receivedOpts?.depth).toBe(5);
  });

  it("hasRelationship with resourceType option", () => {
    const policy = hasRelationship("viewer", { resourceType: "document" });
    const context = makeContext({
      resource: { id: "doc-5" },
      relationshipResolver: allowingResolver,
    });
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.kind).toBe("allow");
    }
  });

  it("resolver error propagated as ACL022 in deny reason", () => {
    const errorResolver: RelationshipResolver = {
      check(): boolean {
        throw new Error("connection refused");
      },
      checkAsync(): Promise<boolean> {
        return Promise.resolve(false);
      },
    };
    const policy = hasRelationship("manager");
    const context = makeContext({
      resource: { id: "team-1" },
      relationshipResolver: errorResolver,
    });
    const result = evaluate(policy, context);
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value.kind === "deny") {
      expect(result.value.reason).toContain("ACL022");
      expect(result.value.reason).toContain("connection refused");
    }
  });
});
