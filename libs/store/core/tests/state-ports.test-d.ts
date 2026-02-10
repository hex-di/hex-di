/**
 * Type-level tests for store port type inference
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  StatePortDef,
  AtomPortDef,
  DerivedPortDef,
  AsyncDerivedPortDef,
  LinkedDerivedPortDef,
  InferStateType,
  InferActionsType,
  InferAtomType,
  InferDerivedType,
  InferAsyncDerivedType,
  InferAsyncDerivedErrorType,
  StateService,
  ActionMap,
} from "../src/index.js";
import {
  createStatePort,
  createAtomPort,
  createDerivedPort,
  createAsyncDerivedPort,
  createLinkedDerivedPort,
} from "../src/index.js";
import type { DirectedPort } from "@hex-di/core";

// =============================================================================
// Test Fixtures
// =============================================================================

interface CounterState {
  count: number;
}

interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
  add: (state: CounterState, payload: number) => CounterState;
}

// =============================================================================
// InferStateType
// =============================================================================

describe("InferStateType", () => {
  it("extracts TState from StatePortDef", () => {
    type Port = StatePortDef<"Counter", CounterState, CounterActions>;
    expectTypeOf<InferStateType<Port>>().toEqualTypeOf<CounterState>();
  });

  it("returns never for non-state port", () => {
    type Port = DerivedPortDef<"Total", number>;
    expectTypeOf<InferStateType<Port>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// InferActionsType
// =============================================================================

describe("InferActionsType", () => {
  it("extracts TActions from StatePortDef", () => {
    type Port = StatePortDef<"Counter", CounterState, CounterActions>;
    expectTypeOf<InferActionsType<Port>>().toEqualTypeOf<CounterActions>();
  });
});

// =============================================================================
// InferAtomType
// =============================================================================

describe("InferAtomType", () => {
  it("extracts TValue from AtomPortDef", () => {
    type Port = AtomPortDef<"Theme", "light" | "dark">;
    expectTypeOf<InferAtomType<Port>>().toEqualTypeOf<"light" | "dark">();
  });

  it("returns never for non-atom port", () => {
    type Port = DerivedPortDef<"Total", number>;
    expectTypeOf<InferAtomType<Port>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// InferDerivedType
// =============================================================================

describe("InferDerivedType", () => {
  it("extracts TResult from DerivedPortDef", () => {
    type Port = DerivedPortDef<"Total", number>;
    expectTypeOf<InferDerivedType<Port>>().toEqualTypeOf<number>();
  });
});

// =============================================================================
// InferAsyncDerivedType
// =============================================================================

describe("InferAsyncDerivedType", () => {
  it("extracts TResult from AsyncDerivedPortDef", () => {
    type Port = AsyncDerivedPortDef<"Rate", number, Error>;
    expectTypeOf<InferAsyncDerivedType<Port>>().toEqualTypeOf<number>();
  });
});

// =============================================================================
// InferAsyncDerivedErrorType
// =============================================================================

describe("InferAsyncDerivedErrorType", () => {
  it("extracts E from AsyncDerivedPortDef", () => {
    type Port = AsyncDerivedPortDef<"Rate", number, Error>;
    expectTypeOf<InferAsyncDerivedErrorType<Port>>().toEqualTypeOf<Error>();
  });

  it("returns never when E defaults to never", () => {
    type Port = AsyncDerivedPortDef<"Rate", number>;
    expectTypeOf<InferAsyncDerivedErrorType<Port>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Port Factory Return Types
// =============================================================================

describe("createStatePort", () => {
  it("returns correctly branded StatePortDef type", () => {
    const port = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    expectTypeOf(port).toEqualTypeOf<StatePortDef<"Counter", CounterState, CounterActions>>();
  });
});

describe("createAtomPort", () => {
  it("returns correctly branded AtomPortDef type", () => {
    const port = createAtomPort<"light" | "dark">()({ name: "Theme" });
    expectTypeOf(port).toEqualTypeOf<AtomPortDef<"Theme", "light" | "dark">>();
  });
});

describe("createDerivedPort", () => {
  it("returns correctly branded DerivedPortDef type", () => {
    const port = createDerivedPort<number>()({ name: "CartTotal" });
    expectTypeOf(port).toEqualTypeOf<DerivedPortDef<"CartTotal", number>>();
  });
});

describe("createAsyncDerivedPort", () => {
  it("returns correctly branded AsyncDerivedPortDef type", () => {
    const port = createAsyncDerivedPort<number, Error>()({
      name: "ExchangeRate",
    });
    expectTypeOf(port).toEqualTypeOf<AsyncDerivedPortDef<"ExchangeRate", number, Error>>();
  });
});

describe("createLinkedDerivedPort", () => {
  it("returns correctly branded LinkedDerivedPortDef type", () => {
    const port = createLinkedDerivedPort<number>()({ name: "Fahrenheit" });
    expectTypeOf(port).toEqualTypeOf<LinkedDerivedPortDef<"Fahrenheit", number>>();
  });
});

// =============================================================================
// Port Structure
// =============================================================================

describe("StatePortDef extends DirectedPort", () => {
  it("extends DirectedPort with correct service type", () => {
    type Port = StatePortDef<"Counter", CounterState, CounterActions>;
    expectTypeOf<Port>().toMatchTypeOf<
      DirectedPort<StateService<CounterState, CounterActions>, "Counter", "outbound">
    >();
  });
});

describe("port name literal", () => {
  it("preserves literal string type via const assertion", () => {
    const port = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    expectTypeOf(port).toMatchTypeOf<StatePortDef<"Counter", CounterState, CounterActions>>();
  });
});
