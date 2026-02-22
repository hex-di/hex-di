import { expectTypeOf, describe, it } from "vitest";
import {
  hasPermission,
  hasRole,
  hasAttribute,
  allOf,
  anyOf,
  not,
  withLabel,
} from "../src/policy/combinators.js";
import { createPermission } from "../src/tokens/permission.js";
import type {
  HasPermissionPolicy,
  HasRolePolicy,
  HasAttributePolicy,
  AllOfPolicy,
  AnyOfPolicy,
  NotPolicy,
  LabeledPolicy,
} from "../src/policy/types.js";
import { eq, subject } from "../src/policy/matchers.js";

const ReadUser = createPermission({ resource: "user", action: "read" });

describe("Policy combinator return types", () => {
  it("hasPermission returns HasPermissionPolicy", () => {
    expectTypeOf(hasPermission(ReadUser)).toMatchTypeOf<HasPermissionPolicy>();
    expectTypeOf(hasPermission(ReadUser).kind).toEqualTypeOf<"hasPermission">();
  });

  it("hasRole returns HasRolePolicy with literal name", () => {
    expectTypeOf(hasRole("admin")).toMatchTypeOf<HasRolePolicy>();
    expectTypeOf(hasRole("admin").roleName).toEqualTypeOf<"admin">();
  });

  it("hasAttribute returns HasAttributePolicy", () => {
    expectTypeOf(hasAttribute("ownerId", eq(subject("id")))).toMatchTypeOf<HasAttributePolicy>();
  });

  it("allOf returns AllOfPolicy", () => {
    expectTypeOf(allOf(hasRole("admin"), hasRole("editor"))).toMatchTypeOf<AllOfPolicy>();
    expectTypeOf(allOf(hasRole("admin")).kind).toEqualTypeOf<"allOf">();
  });

  it("anyOf returns AnyOfPolicy", () => {
    expectTypeOf(anyOf(hasRole("admin"), hasRole("viewer"))).toMatchTypeOf<AnyOfPolicy>();
    expectTypeOf(anyOf(hasRole("admin")).kind).toEqualTypeOf<"anyOf">();
  });

  it("not returns NotPolicy", () => {
    expectTypeOf(not(hasRole("banned"))).toMatchTypeOf<NotPolicy>();
    expectTypeOf(not(hasRole("banned")).kind).toEqualTypeOf<"not">();
  });

  it("withLabel returns LabeledPolicy with string label", () => {
    expectTypeOf(withLabel("myRule", hasRole("admin"))).toMatchTypeOf<LabeledPolicy>();
    expectTypeOf(withLabel("myRule", hasRole("admin")).label).toEqualTypeOf<string>();
  });
});

describe("Policy objects are frozen", () => {
  it("hasRole returns a readonly object", () => {
    const p = hasRole("admin");
    expectTypeOf(p).toMatchTypeOf<Readonly<typeof p>>();
  });

  it("allOf.policies is a readonly array", () => {
    const p = allOf(hasRole("admin"), hasPermission(ReadUser));
    expectTypeOf(p.policies).toMatchTypeOf<readonly unknown[]>();
  });
});
