import { describe, it, expect } from "vitest";
import { createPermission } from "../../src/tokens/permission.js";
import {
  hasPermission,
  hasRole,
  hasAttribute,
  hasResourceAttribute,
  hasSignature,
  hasRelationship,
  allOf,
  anyOf,
  not,
  withLabel,
} from "../../src/policy/combinators.js";
import { eq, subject } from "../../src/policy/matchers.js";
import { hashPolicy } from "../../src/serialization/serialize.js";

const ReadUser = createPermission({ resource: "user", action: "read" });

describe("policy data types", () => {
  // DoD 3 Test 1: each policy kind has a unique kind discriminant
  it("each policy kind has a unique kind discriminant", () => {
    const kinds = new Set([
      hasPermission(ReadUser).kind,
      hasRole("admin").kind,
      hasAttribute("ownerId", eq(subject("id"))).kind,
      hasResourceAttribute("status", eq(subject("id"))).kind,
      hasSignature("approved").kind,
      hasRelationship("owner").kind,
      allOf(hasRole("a"), hasRole("b")).kind,
      anyOf(hasRole("a"), hasRole("b")).kind,
      not(hasRole("banned")).kind,
      withLabel("label", hasRole("admin")).kind,
    ]);
    expect(kinds.size).toBe(10);
  });

  // DoD 3 Test 2: hasPermission policy has permission field
  it("hasPermission policy has permission field", () => {
    const policy = hasPermission(ReadUser);
    expect(policy.kind).toBe("hasPermission");
    expect(policy.permission).toBe(ReadUser);
  });

  // DoD 3 Test 3: hasRole policy has roleName field
  it("hasRole policy has roleName field", () => {
    const policy = hasRole("admin");
    expect(policy.kind).toBe("hasRole");
    expect(policy.roleName).toBe("admin");
  });

  // DoD 3 Test 4: hasAttribute policy has attribute and matcher fields
  it("hasAttribute policy has attribute and matcher fields", () => {
    const matcher = eq(subject("id"));
    const policy = hasAttribute("ownerId", matcher);
    expect(policy.kind).toBe("hasAttribute");
    expect(policy.attribute).toBe("ownerId");
    expect(policy.matcher).toBe(matcher);
  });

  // DoD 3 Test 5: allOf policy has policies array
  it("allOf policy has policies array", () => {
    const policy = allOf(hasPermission(ReadUser), hasRole("editor"));
    expect(policy.kind).toBe("allOf");
    expect(Array.isArray(policy.policies)).toBe(true);
    expect(policy.policies).toHaveLength(2);
  });

  // DoD 3 Test 6: anyOf policy has policies array
  it("anyOf policy has policies array", () => {
    const policy = anyOf(hasRole("admin"), hasRole("moderator"));
    expect(policy.kind).toBe("anyOf");
    expect(Array.isArray(policy.policies)).toBe(true);
    expect(policy.policies).toHaveLength(2);
  });

  // DoD 3 Test 7: not policy has policy field
  it("not policy has policy field", () => {
    const inner = hasRole("banned");
    const policy = not(inner);
    expect(policy.kind).toBe("not");
    expect(policy.policy).toBe(inner);
  });

  // DoD 3 Test 8: labeled policy has label and policy fields
  it("labeled policy has label and policy fields", () => {
    const inner = hasPermission(ReadUser);
    const policy = withLabel("canRead", inner);
    expect(policy.kind).toBe("labeled");
    expect(policy.label).toBe("canRead");
    expect(policy.policy).toBe(inner);
  });

  // DoD 3 Test 9: all policy objects are frozen
  it("all policy objects are frozen", () => {
    expect(Object.isFrozen(hasPermission(ReadUser))).toBe(true);
    expect(Object.isFrozen(hasRole("admin"))).toBe(true);
    expect(Object.isFrozen(hasAttribute("ownerId", eq(subject("id"))))).toBe(true);
    expect(Object.isFrozen(allOf(hasRole("a"), hasRole("b")))).toBe(true);
    expect(Object.isFrozen(anyOf(hasRole("a"), hasRole("b")))).toBe(true);
    expect(Object.isFrozen(not(hasRole("banned")))).toBe(true);
    expect(Object.isFrozen(withLabel("l", hasRole("a")))).toBe(true);
  });

  // DoD 3 Test 10: hashPolicy() returns consistent SHA-256 hex string for same policy
  it("hashPolicy() returns consistent SHA-256 hex string for same policy", () => {
    const policy = hasPermission(ReadUser);
    const hash1 = hashPolicy(policy);
    const hash2 = hashPolicy(policy);
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe("string");
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });
});
