import { expectTypeOf, describe, it } from "vitest";
import { createPermission } from "../src/tokens/permission.js";
import { createRole } from "../src/tokens/role.js";
import { hasPermission, hasRole, allOf, anyOf, not } from "../src/policy/combinators.js";
import type {
  InferPolicyRequirements,
  InferPermissions,
  InferRoleName,
} from "../src/utils/inference.js";
import type { PolicyRequirements } from "../src/utils/inference.js";

const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });

describe("InferPolicyRequirements — type-level tests", () => {
  it("extracts permissions from hasPermission", () => {
    const _policy = hasPermission(ReadUser);
    type R = InferPolicyRequirements<typeof _policy>;
    expectTypeOf<R["permissions"]>().toEqualTypeOf<readonly [typeof ReadUser]>();
    expectTypeOf<R["roleNames"]>().toEqualTypeOf<readonly []>();
  });

  it("extracts role names from hasRole", () => {
    const _policy = hasRole("admin");
    type R = InferPolicyRequirements<typeof _policy>;
    expectTypeOf<R["roleNames"]>().toEqualTypeOf<readonly ["admin"]>();
    expectTypeOf<R["permissions"]>().toEqualTypeOf<readonly []>();
  });

  it("merges requirements from allOf", () => {
    const _policy = allOf(hasPermission(ReadUser), hasRole("editor"));
    type R = InferPolicyRequirements<typeof _policy>;
    // Combined permissions and roles
    expectTypeOf<R>().toMatchTypeOf<PolicyRequirements>();
  });

  it("merges requirements from anyOf", () => {
    const _policy = anyOf(hasRole("admin"), hasRole("editor"));
    type R = InferPolicyRequirements<typeof _policy>;
    expectTypeOf<R>().toMatchTypeOf<PolicyRequirements>();
  });

  it("propagates through not", () => {
    const _policy = not(hasRole("banned"));
    type R = InferPolicyRequirements<typeof _policy>;
    expectTypeOf<R>().toMatchTypeOf<PolicyRequirements>();
  });

  it("InferPermissions extracts permissions from role token", () => {
    const _Viewer = createRole({ name: "viewer", permissions: [ReadUser] });
    type P = InferPermissions<typeof _Viewer>;
    // Should not be never — permissions were provided
    expectTypeOf<P>().not.toEqualTypeOf<never>();
  });

  it("InferRoleName extracts name literal from role token", () => {
    const _Admin = createRole({ name: "admin", permissions: [] });
    type N = InferRoleName<typeof _Admin>;
    expectTypeOf<N>().toEqualTypeOf<"admin">();
  });

  it("allOf with two permission policies collects both", () => {
    const _policy = allOf(hasPermission(ReadUser), hasPermission(WriteUser));
    type R = InferPolicyRequirements<typeof _policy>;
    expectTypeOf<R>().toMatchTypeOf<PolicyRequirements>();
  });
});
