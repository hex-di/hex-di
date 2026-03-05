import { expectTypeOf, test } from "vitest";
import type {
  EffectContract,
  SatisfiesContract,
  ComposeContracts,
  EffectViolation,
  OutputViolation,
  InputViolation,
  ContractCompositionError,
  TaggedError,
} from "../../src/contracts/effect-contract.js";
import type { Result } from "../../src/core/types.js";

// =============================================================================
// Test fixtures
// =============================================================================

type NotFound = TaggedError<"NotFound", { readonly id: string }>;
type Timeout = TaggedError<"Timeout", { readonly ms: number }>;
type Forbidden = TaggedError<"Forbidden", { readonly reason: string }>;

type FetchContract = EffectContract<string, { name: string }, NotFound | Timeout>;

// =============================================================================
// TaggedError
// =============================================================================

test("TaggedError produces readonly tagged object type with fields", () => {
  expectTypeOf<NotFound>().toEqualTypeOf<Readonly<{ _tag: "NotFound"; readonly id: string }>>();
});

test("TaggedError includes _tag discriminant", () => {
  expectTypeOf<Forbidden["_tag"]>().toEqualTypeOf<"Forbidden">();
});

// =============================================================================
// EffectContract structure
// =============================================================================

test("EffectContract carries brand, input, output, and effects", () => {
  expectTypeOf<FetchContract["_brand"]>().toEqualTypeOf<"EffectContract">();
  expectTypeOf<FetchContract["_in"]>().toEqualTypeOf<string>();
  expectTypeOf<FetchContract["_out"]>().toEqualTypeOf<{ name: string }>();
  expectTypeOf<FetchContract["_effects"]>().toEqualTypeOf<NotFound | Timeout>();
});

// =============================================================================
// SatisfiesContract - valid implementations
// =============================================================================

test("SatisfiesContract returns true for exact effect match", () => {
  type ValidFn = (id: string) => Result<{ name: string }, NotFound | Timeout>;
  expectTypeOf<SatisfiesContract<ValidFn, FetchContract>>().toEqualTypeOf<true>();
});

test("SatisfiesContract returns true for subset of effects (subeffecting)", () => {
  type SubsetFn = (id: string) => Result<{ name: string }, NotFound>;
  expectTypeOf<SatisfiesContract<SubsetFn, FetchContract>>().toEqualTypeOf<true>();
});

test("SatisfiesContract returns true for never effects (no errors)", () => {
  type PureFn = (id: string) => Result<{ name: string }, never>;
  expectTypeOf<SatisfiesContract<PureFn, FetchContract>>().toEqualTypeOf<true>();
});

// =============================================================================
// SatisfiesContract - violations
// =============================================================================

test("SatisfiesContract produces EffectViolation for extra effects", () => {
  type ExtraFn = (id: string) => Result<{ name: string }, NotFound | Timeout | Forbidden>;
  type Check = SatisfiesContract<ExtraFn, FetchContract>;
  expectTypeOf<Check>().toEqualTypeOf<
    EffectViolation<NotFound | Timeout | Forbidden, NotFound | Timeout>
  >();
});

test("SatisfiesContract produces OutputViolation for wrong output type", () => {
  type WrongOutputFn = (id: string) => Result<number, NotFound>;
  type Check = SatisfiesContract<WrongOutputFn, FetchContract>;
  expectTypeOf<Check>().toEqualTypeOf<OutputViolation<number, { name: string }>>();
});

test("SatisfiesContract produces InputViolation for wrong input type", () => {
  type WrongInputFn = (id: number) => Result<{ name: string }, NotFound>;
  type Check = SatisfiesContract<WrongInputFn, FetchContract>;
  expectTypeOf<Check>().toEqualTypeOf<InputViolation<[id: number], [string]>>();
});

// =============================================================================
// ComposeContracts - valid composition
// =============================================================================

test("ComposeContracts merges effects and chains input/output", () => {
  type C1 = EffectContract<string, { name: string }, NotFound>;
  type C2 = EffectContract<{ name: string }, boolean, Timeout>;
  type Composed = ComposeContracts<C1, C2>;

  expectTypeOf<Composed>().toEqualTypeOf<EffectContract<string, boolean, NotFound | Timeout>>();
});

test("ComposeContracts with never effects on both sides", () => {
  type C1 = EffectContract<string, number, never>;
  type C2 = EffectContract<number, boolean, never>;
  type Composed = ComposeContracts<C1, C2>;

  expectTypeOf<Composed>().toEqualTypeOf<EffectContract<string, boolean, never>>();
});

// =============================================================================
// ComposeContracts - incompatible composition
// =============================================================================

test("ComposeContracts produces error for incompatible types", () => {
  type C1 = EffectContract<string, { name: string }, NotFound>;
  type C3 = EffectContract<number, boolean, never>;
  type Bad = ComposeContracts<C1, C3>;

  expectTypeOf<Bad>().toEqualTypeOf<ContractCompositionError<{ name: string }, number>>();
});
