import { describe, it, expect } from "vitest";
import { explainPolicy } from "../../src/serialization/explain.js";
import {
  hasPermission,
  hasRole,
  hasAttribute,
  hasSignature,
  allOf,
  anyOf,
  not,
  withLabel,
} from "../../src/policy/combinators.js";
import { eq, literal } from "../../src/policy/matchers.js";
import { createPermission } from "../../src/tokens/permission.js";

const ReadUser = createPermission({ resource: "user", action: "read" });

describe("explainPolicy()", () => {
  it("explains hasPermission", () => {
    const explanation = explainPolicy(hasPermission(ReadUser));
    expect(explanation).toContain("user:read");
  });

  it("explains hasRole", () => {
    const explanation = explainPolicy(hasRole("admin"));
    expect(explanation).toContain("admin");
  });

  it("explains hasAttribute", () => {
    const explanation = explainPolicy(hasAttribute("ownerId", eq(literal("x"))));
    expect(explanation).toContain("ownerId");
  });

  it("explains hasSignature with signerRole", () => {
    const explanation = explainPolicy(hasSignature("approved", { signerRole: "reviewer" }));
    expect(explanation).toContain("approved");
    expect(explanation).toContain("reviewer");
  });

  it("explains allOf with children", () => {
    const explanation = explainPolicy(allOf(hasPermission(ReadUser), hasRole("editor")));
    expect(explanation).toContain("all of");
    expect(explanation).toContain("user:read");
    expect(explanation).toContain("editor");
  });

  it("explains anyOf with children", () => {
    const explanation = explainPolicy(anyOf(hasRole("admin"), hasRole("moderator")));
    expect(explanation).toContain("any of");
  });

  it("explains not", () => {
    const explanation = explainPolicy(not(hasRole("banned")));
    expect(explanation).toContain("not");
  });

  it("explains labeled", () => {
    const explanation = explainPolicy(withLabel("myPolicy", hasPermission(ReadUser)));
    expect(explanation).toContain("myPolicy");
  });

  it("uses indentation for nesting", () => {
    const explanation = explainPolicy(allOf(hasPermission(ReadUser), hasRole("admin")));
    const lines = explanation.split("\n");
    // children should be indented more than parent
    expect(lines[0]).toMatch(/^all of/);
    expect(lines[1]).toMatch(/^ {2}/);
  });
});
