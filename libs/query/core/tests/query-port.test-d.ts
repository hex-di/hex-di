import { describe, it, expectTypeOf } from "vitest";
import type { InferenceError } from "@hex-di/core";
import {
  createQueryPort,
  type InferQueryData,
  type InferQueryParams,
  type InferQueryError,
  type InferQueryName,
  type InferQueryDependsOn,
  type InferQueryDependencyNames,
  type InferQueryTypes,
  type HasParams,
} from "../src/index.js";

interface User {
  id: string;
  name: string;
}

interface Params {
  role?: string;
}

interface ApiError {
  code: number;
  message: string;
}

const UsersPort = createQueryPort<User[], Params>()({ name: "Users" });
const CustomErrorPort = createQueryPort<string, void, ApiError>()({ name: "CustomError" });
const VoidParamsPort = createQueryPort<string>()({ name: "VoidParams" });
const RequiredParamsPort = createQueryPort<string, { id: string }>()({ name: "RequiredParams" });
const IndependentPort = createQueryPort<string, unknown>()({ name: "Independent" });
const DepPort = createQueryPort<string[], unknown>()({ name: "Dep" });
const DependentPort = createQueryPort<User[], unknown>()({
  name: "Dependent",
  dependsOn: [DepPort],
});

describe("Query Port Type-Level Tests", () => {
  it("InferQueryData<typeof UsersPort> resolves to User[]", () => {
    expectTypeOf<InferQueryData<typeof UsersPort>>().toEqualTypeOf<User[]>();
  });

  it("InferQueryParams<typeof UsersPort> resolves to Params", () => {
    expectTypeOf<InferQueryParams<typeof UsersPort>>().toEqualTypeOf<Params>();
  });

  it("InferQueryError<typeof UsersPort> resolves to Error (default)", () => {
    expectTypeOf<InferQueryError<typeof UsersPort>>().toEqualTypeOf<Error>();
  });

  it("InferQueryError<typeof CustomErrorPort> resolves to ApiError", () => {
    expectTypeOf<InferQueryError<typeof CustomErrorPort>>().toEqualTypeOf<ApiError>();
  });

  it("InferQueryName<typeof UsersPort> resolves to 'Users' literal", () => {
    expectTypeOf<InferQueryName<typeof UsersPort>>().toEqualTypeOf<"Users">();
  });

  it("InferQueryDependsOn<typeof IndependentPort> resolves to []", () => {
    expectTypeOf<InferQueryDependsOn<typeof IndependentPort>>().toEqualTypeOf<[]>();
  });

  it("InferQueryDependsOn<typeof DependentPort> resolves to dependsOn tuple", () => {
    expectTypeOf<InferQueryDependsOn<typeof DependentPort>>().toEqualTypeOf<
      readonly [typeof DepPort]
    >();
  });

  it("InferQueryTypes<typeof UsersPort> resolves to correct record shape", () => {
    type Expected = {
      readonly name: "Users";
      readonly data: User[];
      readonly params: Params;
      readonly error: Error;
      readonly dependsOn: [];
    };
    expectTypeOf<InferQueryTypes<typeof UsersPort>>().toEqualTypeOf<Expected>();
  });

  it("InferQueryData<string> produces InferenceError with __source", () => {
    type Result = InferQueryData<string>;
    expectTypeOf<Result>().toHaveProperty("__source");
    expectTypeOf<
      Result extends InferenceError<string, string, unknown> ? true : false
    >().toEqualTypeOf<true>();
  });

  it("InferQueryData<{ name: 'Foo' }> produces InferenceError with __input", () => {
    type Result = InferQueryData<{ name: "Foo" }>;
    expectTypeOf<Result>().toHaveProperty("__input");
  });

  it("InferQueryParams<number> produces InferenceError", () => {
    type Result = InferQueryParams<number>;
    expectTypeOf<Result>().toHaveProperty("__source");
  });

  it("InferQueryError<boolean> produces InferenceError", () => {
    type Result = InferQueryError<boolean>;
    expectTypeOf<Result>().toHaveProperty("__source");
  });

  it("InferQueryName<42> produces InferenceError", () => {
    type Result = InferQueryName<42>;
    expectTypeOf<Result>().toHaveProperty("__source");
  });

  it("QueryPort is assignable to DirectedPort<QueryFetcher, TName, 'inbound'>", () => {
    type QP = typeof UsersPort;
    // QueryPort extends DirectedPort -- check __portName is present
    expectTypeOf<QP>().toHaveProperty("__portName");
    expectTypeOf<QP["__portName"]>().toEqualTypeOf<"Users">();
  });

  it("HasParams<typeof VoidParamsPort> resolves to false", () => {
    expectTypeOf<HasParams<typeof VoidParamsPort>>().toEqualTypeOf<false>();
  });

  it("HasParams<typeof RequiredParamsPort> resolves to true", () => {
    expectTypeOf<HasParams<typeof RequiredParamsPort>>().toEqualTypeOf<true>();
  });

  it("InferQueryDependencyNames<typeof DependentPort> resolves to union of dependency names", () => {
    expectTypeOf<InferQueryDependencyNames<typeof DependentPort>>().toEqualTypeOf<"Dep">();
  });
});
