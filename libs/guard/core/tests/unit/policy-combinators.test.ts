import { describe, it, expect } from "vitest";
import { createPermission } from "../../src/tokens/permission.js";
import {
  hasPermission,
  hasRole,
  hasSignature,
  hasRelationship,
  allOf,
  anyOf,
  not,
  withLabel,
  anyOfRoles,
} from "../../src/policy/combinators.js";
import { createRole } from "../../src/tokens/role.js";

const ReadUser = createPermission({ resource: "user", action: "read" });

describe("policy combinators", () => {
  // DoD 4 Test 1: hasPermission with fields option
  it("hasPermission with fields produces policy with fields", () => {
    const policy = hasPermission(ReadUser, { fields: ["name", "email"] });
    expect(policy.fields).toEqual(["name", "email"]);
  });

  // DoD 4 Test 2: hasSignature with signerRole option
  it("hasSignature with signerRole option", () => {
    const policy = hasSignature("approved", { signerRole: "reviewer" });
    expect(policy.kind).toBe("hasSignature");
    expect(policy.signerRole).toBe("reviewer");
  });

  // DoD 4 Test 3: hasRelationship with options
  it("hasRelationship with depth and resourceType options", () => {
    const policy = hasRelationship("owner", { depth: 2, resourceType: "document" });
    expect(policy.kind).toBe("hasRelationship");
    expect(policy.relation).toBe("owner");
    expect(policy.depth).toBe(2);
    expect(policy.resourceType).toBe("document");
  });

  // DoD 4 Test 4: allOf composes multiple policies
  it("allOf composes multiple policies in sequence", () => {
    const policy = allOf(hasPermission(ReadUser), hasRole("editor"), hasRole("active"));
    expect(policy.kind).toBe("allOf");
    expect(policy.policies).toHaveLength(3);
  });

  // DoD 4 Test 5: anyOf composes multiple policies
  it("anyOf composes multiple policies as alternatives", () => {
    const policy = anyOf(hasRole("admin"), hasRole("moderator"), hasRole("editor"));
    expect(policy.kind).toBe("anyOf");
    expect(policy.policies).toHaveLength(3);
  });

  // DoD 4 Test 6: not negates inner policy
  it("not negates inner policy correctly", () => {
    const inner = hasRole("banned");
    const policy = not(inner);
    expect(policy.kind).toBe("not");
    expect(policy.policy.kind).toBe("hasRole");
  });

  // DoD 4 Test 7: withLabel attaches label to policy
  it("withLabel attaches descriptive label", () => {
    const policy = withLabel("canRead", hasPermission(ReadUser));
    expect(policy.kind).toBe("labeled");
    expect(policy.label).toBe("canRead");
    expect(policy.policy.kind).toBe("hasPermission");
  });

  // DoD 4 Test 8: anyOfRoles from role name strings
  it("anyOfRoles creates anyOf from role name strings", () => {
    const gate = anyOfRoles(["admin", "moderator"]);
    expect(gate.kind).toBe("anyOf");
    expect(gate.policies).toHaveLength(2);
  });

  // DoD 4 Test 9: anyOfRoles from role tokens
  it("anyOfRoles accepts role tokens", () => {
    const AdminRole = createRole({ name: "admin", permissions: [] });
    const gate = anyOfRoles([AdminRole]);
    expect(gate.kind).toBe("anyOf");
    expect((gate.policies[0] as { roleName: string }).roleName).toBe("admin");
  });
});
