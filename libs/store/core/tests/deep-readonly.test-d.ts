/**
 * Type-level tests for DeepReadonly
 */

import { describe, expectTypeOf, it } from "vitest";
import type { DeepReadonly } from "../src/index.js";

// =============================================================================
// Primitive pass-through
// =============================================================================

describe("DeepReadonly — primitives", () => {
  it("number passes through unchanged", () => {
    expectTypeOf<DeepReadonly<number>>().toEqualTypeOf<number>();
  });

  it("string passes through unchanged", () => {
    expectTypeOf<DeepReadonly<string>>().toEqualTypeOf<string>();
  });

  it("boolean passes through unchanged", () => {
    expectTypeOf<DeepReadonly<boolean>>().toEqualTypeOf<boolean>();
  });
});

// =============================================================================
// Objects
// =============================================================================

describe("DeepReadonly — objects", () => {
  it("shallow object properties become readonly", () => {
    expectTypeOf<DeepReadonly<{ a: number }>>().toEqualTypeOf<{ readonly a: number }>();
  });

  it("nested objects become deeply readonly", () => {
    type Input = { a: { b: string } };
    type Expected = { readonly a: { readonly b: string } };
    expectTypeOf<DeepReadonly<Input>>().toEqualTypeOf<Expected>();
  });
});

// =============================================================================
// Arrays
// =============================================================================

describe("DeepReadonly — arrays", () => {
  it("arrays become readonly arrays of DeepReadonly elements", () => {
    expectTypeOf<DeepReadonly<string[]>>().toEqualTypeOf<readonly string[]>();
  });

  it("arrays of objects become readonly arrays of readonly objects", () => {
    type Input = Array<{ id: number }>;
    type Expected = readonly { readonly id: number }[];
    expectTypeOf<DeepReadonly<Input>>().toEqualTypeOf<Expected>();
  });
});

// =============================================================================
// Maps and Sets
// =============================================================================

describe("DeepReadonly — Maps and Sets", () => {
  it("Maps become ReadonlyMaps with deeply readonly values", () => {
    expectTypeOf<DeepReadonly<Map<string, number>>>().toEqualTypeOf<ReadonlyMap<string, number>>();
  });

  it("Maps with object values become ReadonlyMaps with deeply readonly values", () => {
    type Input = Map<string, { x: number }>;
    type Expected = ReadonlyMap<string, { readonly x: number }>;
    expectTypeOf<DeepReadonly<Input>>().toEqualTypeOf<Expected>();
  });

  it("Sets become ReadonlySets with deeply readonly elements", () => {
    expectTypeOf<DeepReadonly<Set<number>>>().toEqualTypeOf<ReadonlySet<number>>();
  });
});

// =============================================================================
// Functions
// =============================================================================

describe("DeepReadonly — functions", () => {
  it("functions are preserved as-is", () => {
    type Fn = (x: number) => string;
    expectTypeOf<DeepReadonly<Fn>>().toEqualTypeOf<Fn>();
  });
});
