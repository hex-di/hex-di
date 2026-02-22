import { expectTypeOf, describe, it } from "vitest";
import { createPermission } from "../src/tokens/permission.js";
import type { InferResource, InferAction, FormatPermission } from "../src/utils/inference.js";

describe("Permission type-level tests", () => {
  it("Permission<R,A> preserves resource literal type", () => {
    const perm = createPermission({ resource: "user", action: "read" });
    expectTypeOf(perm.resource).toEqualTypeOf<"user">();
  });

  it("Permission<R,A> preserves action literal type", () => {
    const perm = createPermission({ resource: "user", action: "read" });
    expectTypeOf(perm.action).toEqualTypeOf<"read">();
  });

  it("InferResource extracts resource literal", () => {
    const _perm = createPermission({ resource: "order", action: "create" });
    type R = InferResource<typeof _perm>;
    expectTypeOf<R>().toEqualTypeOf<"order">();
  });

  it("InferAction extracts action literal", () => {
    const _perm = createPermission({ resource: "order", action: "create" });
    type A = InferAction<typeof _perm>;
    expectTypeOf<A>().toEqualTypeOf<"create">();
  });

  it("FormatPermission formats as 'resource:action'", () => {
    const _perm = createPermission({ resource: "user", action: "delete" });
    type F = FormatPermission<typeof _perm>;
    expectTypeOf<F>().toEqualTypeOf<"user:delete">();
  });
});
