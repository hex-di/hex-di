/**
 * Type-level tests for DependencyData and DependencyParamsMap.
 */

import { expectTypeOf, describe, it } from "vitest";
import { createQueryPort, type DependencyData, type DependencyParamsMap } from "../src/index.js";

// =============================================================================
// Test Ports
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
}

interface Post {
  readonly id: string;
  readonly title: string;
}

const UsersPort = createQueryPort<User[], { role: string }, Error>()({
  name: "users",
});

const PostsPort = createQueryPort<Post[], { authorId: string }, Error>()({
  name: "posts",
});

const CountPort = createQueryPort<number, void, Error>()({
  name: "count",
});

// =============================================================================
// DependencyData
// =============================================================================

describe("DependencyData", () => {
  it("maps dependency tuple to { portName: dataType } record", () => {
    type Result = DependencyData<readonly [typeof UsersPort, typeof PostsPort]>;
    expectTypeOf<Result>().toEqualTypeOf<{
      readonly users: User[];
      readonly posts: Post[];
    }>();
  });

  it("handles single dependency", () => {
    type Result = DependencyData<readonly [typeof UsersPort]>;
    expectTypeOf<Result>().toEqualTypeOf<{
      readonly users: User[];
    }>();
  });

  it("handles empty dependency array", () => {
    type Result = DependencyData<readonly []>;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    expectTypeOf<Result>().toEqualTypeOf<{}>();
  });
});

// =============================================================================
// DependencyParamsMap
// =============================================================================

describe("DependencyParamsMap", () => {
  it("maps dependency tuple to { portName: paramsType } record", () => {
    type Result = DependencyParamsMap<readonly [typeof UsersPort, typeof PostsPort]>;
    expectTypeOf<Result>().toEqualTypeOf<{
      readonly users: { role: string };
      readonly posts: { authorId: string };
    }>();
  });

  it("handles single dependency", () => {
    type Result = DependencyParamsMap<readonly [typeof CountPort]>;
    expectTypeOf<Result>().toEqualTypeOf<{
      readonly count: void;
    }>();
  });

  it("handles empty dependency array", () => {
    type Result = DependencyParamsMap<readonly []>;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    expectTypeOf<Result>().toEqualTypeOf<{}>();
  });
});
