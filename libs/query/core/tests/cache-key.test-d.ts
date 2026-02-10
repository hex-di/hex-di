import { describe, it, expectTypeOf } from "vitest";
import { createCacheKey, createQueryPort, type CacheKey } from "../src/index.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "Users" });

describe("CacheKey Type-Level Tests", () => {
  it("Branded CacheKey is not assignable from plain readonly [string, string] tuple", () => {
    const plain: readonly [string, string] = ["Users", "hash"];
    // @ts-expect-error -- plain tuple should not be assignable to CacheKey
    const _key: CacheKey = plain;
  });

  it("createCacheKey returns CacheKey<TName> with correct port name literal", () => {
    const key = createCacheKey(UsersPort, undefined);
    expectTypeOf(key).toMatchTypeOf<CacheKey<"Users">>();
  });

  it("CacheKey<'Users'> carries the port name in the type", () => {
    type UsersKey = CacheKey<"Users">;
    expectTypeOf<UsersKey[0]>().toEqualTypeOf<"Users">();
  });
});
