import { describe, it, expectTypeOf } from "vitest";
import type {
  Disposable,
  NonDisposable,
  ResourceKindOf,
  IsDisposable,
  IsNonDisposable,
  InferResourceKind,
  AggregateDisposal,
  ResourceKind,
} from "../src/resources/index.js";

interface DbService {
  query(): void;
}
interface ValidatorService {
  validate(): boolean;
}

describe("Disposable phantom brand", () => {
  it("marks service as disposable", () => {
    type D = Disposable<DbService>;
    expectTypeOf<ResourceKindOf<D>>().toEqualTypeOf<"disposable">();
    expectTypeOf<IsDisposable<D>>().toEqualTypeOf<true>();
    expectTypeOf<IsNonDisposable<D>>().toEqualTypeOf<false>();
  });
});

describe("NonDisposable phantom brand", () => {
  it("marks service as non-disposable", () => {
    type ND = NonDisposable<ValidatorService>;
    expectTypeOf<ResourceKindOf<ND>>().toEqualTypeOf<"non-disposable">();
    expectTypeOf<IsDisposable<ND>>().toEqualTypeOf<false>();
    expectTypeOf<IsNonDisposable<ND>>().toEqualTypeOf<true>();
  });
});

describe("ResourceKind", () => {
  it("is a union of disposable and non-disposable", () => {
    expectTypeOf<ResourceKind>().toEqualTypeOf<"disposable" | "non-disposable">();
  });
});

describe("InferResourceKind", () => {
  it("infers disposable from config with finalizer", () => {
    type Config = { factory: () => void; finalizer: (s: unknown) => void };
    expectTypeOf<InferResourceKind<Config>>().toEqualTypeOf<"disposable">();
  });

  it("infers non-disposable from config without finalizer", () => {
    type Config = { factory: () => void };
    expectTypeOf<InferResourceKind<Config>>().toEqualTypeOf<"non-disposable">();
  });
});

describe("AggregateDisposal", () => {
  it("returns disposable if any resource is disposable", () => {
    type Agg = AggregateDisposal<[Disposable<DbService>, NonDisposable<ValidatorService>]>;
    expectTypeOf<Agg>().toEqualTypeOf<"disposable">();
  });

  it("returns non-disposable if all are non-disposable", () => {
    type Agg = AggregateDisposal<
      [NonDisposable<ValidatorService>, NonDisposable<ValidatorService>]
    >;
    expectTypeOf<Agg>().toEqualTypeOf<"non-disposable">();
  });
});
