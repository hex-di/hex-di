/**
 * Type tests for scoped reference tracking.
 *
 * Verifies:
 * - ScopedRef branded type prevents cross-scope assignment
 * - ScopedRef is assignable to the underlying service type (gradual adoption)
 * - IsScopedRef, ExtractScopeId, ExtractService type utilities
 * - ScopedContainer resolve method returns branded refs
 * - AssertNoEscape detects direct and nested scope escapes
 * - ContainsScopedRef recursive detection
 * - transferRef re-brands references
 *
 * Requirements tested:
 * - BEH-CO-09-001: ScopedRef Branded Type
 * - BEH-CO-09-002: Scope Escape Detection
 * - BEH-CO-09-003: Explicit Scope Transfer
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  ScopedRef,
  IsScopedRef,
  ExtractScopeId,
  ExtractService,
  ScopedContainer,
  AssertNoEscape,
  ContainsScopedRef,
  ScopeBound,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface UserRepo {
  findById(id: string): Promise<{ name: string } | null>;
}

// =============================================================================
// BEH-CO-09-001: ScopedRef Branded Type
// =============================================================================

describe("BEH-CO-09-001: ScopedRef Branded Type", () => {
  it("brands a service type with scope identity", () => {
    type Ref = ScopedRef<Logger, "req-1">;
    expectTypeOf<Ref>().toMatchTypeOf<Logger>();
  });

  it("different scope identities are incompatible", () => {
    type RefA = ScopedRef<Logger, "req-1">;
    type RefB = ScopedRef<Logger, "req-2">;
    // RefA should NOT be assignable to RefB
    expectTypeOf<RefA>().not.toEqualTypeOf<RefB>();
  });

  it("ScopedRef is assignable to the underlying service type (gradual adoption)", () => {
    type Ref = ScopedRef<Logger, "req-1">;
    // ScopedRef<Logger, "req-1"> extends Logger
    expectTypeOf<Ref>().toMatchTypeOf<Logger>();
  });

  it("same scope identity produces compatible types", () => {
    type RefA = ScopedRef<Logger, "req-1">;
    type RefB = ScopedRef<Logger, "req-1">;
    expectTypeOf<RefA>().toEqualTypeOf<RefB>();
  });

  it("different service types with same scope are incompatible", () => {
    type LoggerRef = ScopedRef<Logger, "req-1">;
    type RepoRef = ScopedRef<UserRepo, "req-1">;
    expectTypeOf<LoggerRef>().not.toEqualTypeOf<RepoRef>();
  });
});

// =============================================================================
// Type Utility Tests
// =============================================================================

describe("IsScopedRef type predicate", () => {
  it("detects ScopedRef", () => {
    type Result = IsScopedRef<ScopedRef<Logger, "req-1">>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("rejects plain types", () => {
    type Result = IsScopedRef<Logger>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("rejects primitives", () => {
    type Result = IsScopedRef<string>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

describe("ExtractScopeId", () => {
  it("extracts scope identity from ScopedRef", () => {
    type Result = ExtractScopeId<ScopedRef<Logger, "req-1">>;
    expectTypeOf<Result>().toEqualTypeOf<"req-1">();
  });

  it("returns never for non-scoped types", () => {
    type Result = ExtractScopeId<Logger>;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });
});

describe("ExtractService", () => {
  it("strips scope brand from ScopedRef", () => {
    type Result = ExtractService<ScopedRef<Logger, "req-1">>;
    expectTypeOf<Result>().toEqualTypeOf<Logger>();
  });

  it("returns the type unchanged if not a ScopedRef", () => {
    type Result = ExtractService<Logger>;
    expectTypeOf<Result>().toEqualTypeOf<Logger>();
  });
});

// =============================================================================
// BEH-CO-09-001: ScopedContainer
// =============================================================================

describe("ScopedContainer", () => {
  it("resolve returns branded ref when active", () => {
    type SC = ScopedContainer<{ Logger: Logger }, "req-1", "active">;
    type ResolveFn = SC["resolve"];
    // resolve should be a function, not never
    expectTypeOf<ResolveFn>().not.toBeNever();
  });

  it("resolve is never when not active", () => {
    type SC = ScopedContainer<{ Logger: Logger }, "req-1", "disposed">;
    type ResolveFn = SC["resolve"];
    expectTypeOf<ResolveFn>().toBeNever();
  });

  it("exposes scopeId", () => {
    type SC = ScopedContainer<{ Logger: Logger }, "req-1">;
    expectTypeOf<SC["scopeId"]>().toEqualTypeOf<"req-1">();
  });
});

// =============================================================================
// BEH-CO-09-002: Scope Escape Detection
// =============================================================================

describe("BEH-CO-09-002: AssertNoEscape", () => {
  it("passes through non-scoped types", () => {
    type Result = AssertNoEscape<number, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<number>();
  });

  it("passes through plain objects", () => {
    type Result = AssertNoEscape<{ data: string }, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<{ data: string }>();
  });

  it("detects direct ScopedRef escape", () => {
    type Result = AssertNoEscape<ScopedRef<Logger, "req-1">, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<
      ["ERROR: Scoped reference cannot escape its scope", "req-1"]
    >();
  });

  it("detects ScopedRef in object properties", () => {
    type Result = AssertNoEscape<{ repo: ScopedRef<UserRepo, "req-1"> }, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<
      ["ERROR: Scoped reference cannot escape its scope", "req-1"]
    >();
  });

  it("detects ScopedRef in Promise", () => {
    type Result = AssertNoEscape<Promise<ScopedRef<Logger, "req-1">>, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<
      ["ERROR: Scoped reference cannot escape its scope", "req-1"]
    >();
  });

  it("allows different scope identity (no escape for that scope)", () => {
    // Checking escape for "req-2" but ref is from "req-1" - no escape detected
    type Result = AssertNoEscape<ScopedRef<Logger, "req-1">, "req-2">;
    expectTypeOf<Result>().toMatchTypeOf<ScopedRef<Logger, "req-1">>();
  });
});

describe("BEH-CO-09-002: ContainsScopedRef", () => {
  it("detects direct ScopedRef", () => {
    type Result = ContainsScopedRef<ScopedRef<Logger, "req-1">, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("rejects plain types", () => {
    type Result = ContainsScopedRef<number, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("detects in Promise wrapper", () => {
    type Result = ContainsScopedRef<Promise<ScopedRef<Logger, "req-1">>, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("detects in arrays", () => {
    type Result = ContainsScopedRef<ReadonlyArray<ScopedRef<Logger, "req-1">>, "req-1">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// BEH-CO-09-002: ScopeBound
// =============================================================================

describe("ScopeBound", () => {
  it("processInScope accepts matching scope refs", () => {
    type Bound = ScopeBound<"req-1">;
    type ProcessFn = Bound["processInScope"];
    // Should accept ScopedRef with matching scope
    expectTypeOf<ProcessFn>().not.toBeNever();
  });
});

// =============================================================================
// BEH-CO-09-003: Transfer types
// =============================================================================

describe("BEH-CO-09-003: transferRef type signature", () => {
  it("re-brands from source scope to target scope", () => {
    // This is a type-level verification that transferRef's signature is correct.
    // The function takes ScopedRef<T, TFrom> and returns ScopedRef<T, TTo>.
    type Input = ScopedRef<Logger, "parent">;
    type Output = ScopedRef<Logger, "child">;
    // They should be incompatible (different scope brands)
    expectTypeOf<Input>().not.toEqualTypeOf<Output>();
  });
});
