import { expectTypeOf, describe, it } from "vitest";
import { createPermission } from "../src/tokens/permission.js";
import { createRole } from "../src/tokens/role.js";
import type { InferPermissions, InferRoleName } from "../src/utils/inference.js";

const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });

describe("Role type-level tests", () => {
  it("InferRoleName extracts the role name literal", () => {
    const _Viewer = createRole({ name: "viewer", permissions: [ReadUser] });
    type N = InferRoleName<typeof _Viewer>;
    expectTypeOf<N>().toEqualTypeOf<"viewer">();
  });

  it("InferPermissions includes direct permissions", () => {
    const _Viewer = createRole({ name: "viewer", permissions: [ReadUser] });
    type P = InferPermissions<typeof _Viewer>;
    expectTypeOf<P>().toMatchTypeOf<typeof ReadUser>();
  });

  it("InferPermissions includes inherited permissions", () => {
    const Viewer = createRole({ name: "viewer", permissions: [ReadUser] });
    const _Editor = createRole({
      name: "editor",
      permissions: [WriteUser],
      inherits: [Viewer],
    });
    type P = InferPermissions<typeof _Editor>;
    expectTypeOf<P>().toMatchTypeOf<typeof ReadUser | typeof WriteUser>();
  });
});
