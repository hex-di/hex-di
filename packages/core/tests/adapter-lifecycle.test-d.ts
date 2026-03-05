/**
 * Type tests for adapter lifecycle states.
 *
 * Verifies the type-level state machine for AdapterHandle:
 * - State-conditional method availability (never in wrong states)
 * - ValidTransition and CanTransition conditional types
 * - AdapterHandle phantom state branding
 *
 * Requirements tested:
 * - BEH-CO-08-001: AdapterHandle Phantom State
 * - BEH-CO-08-002: State-Conditional Method Availability
 * - BEH-CO-08-003: State Transition Validation
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  AdapterLifecycleState,
  StateGuardedMethod,
  ValidTransition,
  CanTransition,
  AdapterHandle,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Database {
  query(sql: string): Promise<ReadonlyArray<unknown>>;
}

// =============================================================================
// BEH-CO-08-001: AdapterHandle Phantom State
// =============================================================================

describe("BEH-CO-08-001: AdapterHandle Phantom State", () => {
  it("created handle has state 'created'", () => {
    type H = AdapterHandle<Database, "created">;
    expectTypeOf<H["state"]>().toEqualTypeOf<"created">();
  });

  it("initialized handle has state 'initialized'", () => {
    type H = AdapterHandle<Database, "initialized">;
    expectTypeOf<H["state"]>().toEqualTypeOf<"initialized">();
  });

  it("active handle has state 'active'", () => {
    type H = AdapterHandle<Database, "active">;
    expectTypeOf<H["state"]>().toEqualTypeOf<"active">();
  });

  it("disposing handle has state 'disposing'", () => {
    type H = AdapterHandle<Database, "disposing">;
    expectTypeOf<H["state"]>().toEqualTypeOf<"disposing">();
  });

  it("disposed handle has state 'disposed'", () => {
    type H = AdapterHandle<Database, "disposed">;
    expectTypeOf<H["state"]>().toEqualTypeOf<"disposed">();
  });

  it("default TState is 'created'", () => {
    type H = AdapterHandle<Database>;
    expectTypeOf<H["state"]>().toEqualTypeOf<"created">();
  });

  it("active handle exposes service as T", () => {
    type H = AdapterHandle<Database, "active">;
    expectTypeOf<H["service"]>().toEqualTypeOf<Database>();
  });

  it("created handle has service as never", () => {
    type H = AdapterHandle<Database, "created">;
    expectTypeOf<H["service"]>().toBeNever();
  });

  it("disposed handle has service as never", () => {
    type H = AdapterHandle<Database, "disposed">;
    expectTypeOf<H["service"]>().toBeNever();
  });
});

// =============================================================================
// BEH-CO-08-002: State-Conditional Method Availability
// =============================================================================

describe("BEH-CO-08-002: State-Conditional Method Availability", () => {
  describe("StateGuardedMethod utility type", () => {
    it("returns signature when state matches", () => {
      type Result = StateGuardedMethod<"created", "created", () => void>;
      expectTypeOf<Result>().toEqualTypeOf<() => void>();
    });

    it("returns never when state does not match", () => {
      type Result = StateGuardedMethod<"active", "created", () => void>;
      expectTypeOf<Result>().toBeNever();
    });
  });

  describe("initialize() availability", () => {
    it("available in 'created' state", () => {
      type H = AdapterHandle<Database, "created">;
      expectTypeOf<H["initialize"]>().toEqualTypeOf<
        () => Promise<AdapterHandle<Database, "initialized">>
      >();
    });

    it("never in 'initialized' state", () => {
      type H = AdapterHandle<Database, "initialized">;
      expectTypeOf<H["initialize"]>().toBeNever();
    });

    it("never in 'active' state", () => {
      type H = AdapterHandle<Database, "active">;
      expectTypeOf<H["initialize"]>().toBeNever();
    });

    it("never in 'disposing' state", () => {
      type H = AdapterHandle<Database, "disposing">;
      expectTypeOf<H["initialize"]>().toBeNever();
    });

    it("never in 'disposed' state", () => {
      type H = AdapterHandle<Database, "disposed">;
      expectTypeOf<H["initialize"]>().toBeNever();
    });
  });

  describe("activate() availability", () => {
    it("never in 'created' state", () => {
      type H = AdapterHandle<Database, "created">;
      expectTypeOf<H["activate"]>().toBeNever();
    });

    it("available in 'initialized' state", () => {
      type H = AdapterHandle<Database, "initialized">;
      expectTypeOf<H["activate"]>().toEqualTypeOf<() => AdapterHandle<Database, "active">>();
    });

    it("never in 'active' state", () => {
      type H = AdapterHandle<Database, "active">;
      expectTypeOf<H["activate"]>().toBeNever();
    });

    it("never in 'disposing' state", () => {
      type H = AdapterHandle<Database, "disposing">;
      expectTypeOf<H["activate"]>().toBeNever();
    });

    it("never in 'disposed' state", () => {
      type H = AdapterHandle<Database, "disposed">;
      expectTypeOf<H["activate"]>().toBeNever();
    });
  });

  describe("dispose() availability", () => {
    it("never in 'created' state", () => {
      type H = AdapterHandle<Database, "created">;
      expectTypeOf<H["dispose"]>().toBeNever();
    });

    it("never in 'initialized' state", () => {
      type H = AdapterHandle<Database, "initialized">;
      expectTypeOf<H["dispose"]>().toBeNever();
    });

    it("available in 'active' state", () => {
      type H = AdapterHandle<Database, "active">;
      expectTypeOf<H["dispose"]>().toEqualTypeOf<
        () => Promise<AdapterHandle<Database, "disposed">>
      >();
    });

    it("never in 'disposing' state", () => {
      type H = AdapterHandle<Database, "disposing">;
      expectTypeOf<H["dispose"]>().toBeNever();
    });

    it("never in 'disposed' state", () => {
      type H = AdapterHandle<Database, "disposed">;
      expectTypeOf<H["dispose"]>().toBeNever();
    });
  });

  describe("service availability", () => {
    it("never in 'created' state", () => {
      type H = AdapterHandle<Database, "created">;
      expectTypeOf<H["service"]>().toBeNever();
    });

    it("never in 'initialized' state", () => {
      type H = AdapterHandle<Database, "initialized">;
      expectTypeOf<H["service"]>().toBeNever();
    });

    it("T in 'active' state", () => {
      type H = AdapterHandle<Database, "active">;
      expectTypeOf<H["service"]>().toEqualTypeOf<Database>();
    });

    it("never in 'disposing' state", () => {
      type H = AdapterHandle<Database, "disposing">;
      expectTypeOf<H["service"]>().toBeNever();
    });

    it("never in 'disposed' state", () => {
      type H = AdapterHandle<Database, "disposed">;
      expectTypeOf<H["service"]>().toBeNever();
    });
  });
});

// =============================================================================
// BEH-CO-08-003: State Transition Validation
// =============================================================================

describe("BEH-CO-08-003: ValidTransition conditional type", () => {
  it("created → initialized", () => {
    expectTypeOf<ValidTransition<"created">>().toEqualTypeOf<"initialized">();
  });

  it("initialized → active", () => {
    expectTypeOf<ValidTransition<"initialized">>().toEqualTypeOf<"active">();
  });

  it("active → disposing", () => {
    expectTypeOf<ValidTransition<"active">>().toEqualTypeOf<"disposing">();
  });

  it("disposing → disposed", () => {
    expectTypeOf<ValidTransition<"disposing">>().toEqualTypeOf<"disposed">();
  });

  it("disposed → never (terminal)", () => {
    expectTypeOf<ValidTransition<"disposed">>().toBeNever();
  });
});

describe("BEH-CO-08-003: CanTransition boolean check", () => {
  // Valid transitions
  it("created → initialized = true", () => {
    expectTypeOf<CanTransition<"created", "initialized">>().toEqualTypeOf<true>();
  });

  it("initialized → active = true", () => {
    expectTypeOf<CanTransition<"initialized", "active">>().toEqualTypeOf<true>();
  });

  it("active → disposing = true", () => {
    expectTypeOf<CanTransition<"active", "disposing">>().toEqualTypeOf<true>();
  });

  it("disposing → disposed = true", () => {
    expectTypeOf<CanTransition<"disposing", "disposed">>().toEqualTypeOf<true>();
  });

  // Invalid: skipping states
  it("created → active = false (skip)", () => {
    expectTypeOf<CanTransition<"created", "active">>().toEqualTypeOf<false>();
  });

  it("created → disposed = false (skip)", () => {
    expectTypeOf<CanTransition<"created", "disposed">>().toEqualTypeOf<false>();
  });

  it("initialized → disposed = false (skip)", () => {
    expectTypeOf<CanTransition<"initialized", "disposed">>().toEqualTypeOf<false>();
  });

  // Invalid: backward transitions
  it("active → created = false (backward)", () => {
    expectTypeOf<CanTransition<"active", "created">>().toEqualTypeOf<false>();
  });

  it("disposed → created = false (backward)", () => {
    expectTypeOf<CanTransition<"disposed", "created">>().toEqualTypeOf<false>();
  });

  it("initialized → created = false (backward)", () => {
    expectTypeOf<CanTransition<"initialized", "created">>().toEqualTypeOf<false>();
  });

  // Invalid: self-transitions
  it("created → created = false (self)", () => {
    expectTypeOf<CanTransition<"created", "created">>().toEqualTypeOf<false>();
  });

  it("active → active = false (self)", () => {
    expectTypeOf<CanTransition<"active", "active">>().toEqualTypeOf<false>();
  });

  // Invalid: from terminal state
  it("disposed → initialized = false (terminal)", () => {
    expectTypeOf<CanTransition<"disposed", "initialized">>().toEqualTypeOf<false>();
  });

  it("disposed → disposing = false (terminal)", () => {
    expectTypeOf<CanTransition<"disposed", "disposing">>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// AdapterLifecycleState is a union of 5 members
// =============================================================================

describe("AdapterLifecycleState union", () => {
  it("is the correct union", () => {
    expectTypeOf<AdapterLifecycleState>().toEqualTypeOf<
      "created" | "initialized" | "active" | "disposing" | "disposed"
    >();
  });
});
