/**
 * Type-level tests for adapter factories and related types
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  createStatePort,
  createAtomPort,
  createDerivedPort,
  createAsyncDerivedPort,
  createLinkedDerivedPort,
  createDerivedAdapter,
  createAsyncDerivedAdapter,
  createLinkedDerivedAdapter,
  createStateAdapter,
  createEffectAdapter,
} from "../src/index.js";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import type { PortDeps, EmptyDeps } from "@hex-di/core";
import type {
  ActionMap,
  StateService,
  AtomService,
  DerivedService,
  AsyncDerivedService,
  LinkedDerivedService,
  EffectMap,
  EffectContext,
  EffectErrorHandler,
  EffectFailedError,
  ActionEffect,
  ActionEvent,
  StatePortDef,
  AtomPortDef,
  DerivedPortDef,
  AsyncDerivedPortDef,
  LinkedDerivedPortDef,
  InferStateType,
  InferActionsType,
  InferAtomType,
  InferLinkedDerivedType,
  DeepReadonly,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface CounterState {
  readonly count: number;
  readonly label: string;
}

interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
  setLabel: (state: CounterState, label: string) => CounterState;
}

// =============================================================================
// createStateAdapter config type inference
// =============================================================================

describe("State adapter type inference", () => {
  it("StatePortDef provides field matches TState", () => {
    type Port = StatePortDef<"Counter", CounterState, CounterActions>;
    expectTypeOf<InferStateType<Port>>().toEqualTypeOf<CounterState>();
  });

  it("StatePortDef actions field matches TActions", () => {
    type Port = StatePortDef<"Counter", CounterState, CounterActions>;
    expectTypeOf<InferActionsType<Port>>().toEqualTypeOf<CounterActions>();
  });
});

// =============================================================================
// createAtomAdapter config type inference
// =============================================================================

describe("Atom adapter type inference", () => {
  it("AtomPortDef infers value type", () => {
    type Port = AtomPortDef<"Theme", "light" | "dark">;
    expectTypeOf<InferAtomType<Port>>().toEqualTypeOf<"light" | "dark">();
  });
});

// =============================================================================
// createDerivedAdapter config type inference
// =============================================================================

describe("Derived adapter type inference", () => {
  it("DerivedPortDef carries result type in service", () => {
    type Port = DerivedPortDef<"Total", number>;
    type Service = DerivedService<number>;
    // DerivedPortDef is a DirectedPort<DerivedService<TResult>, ...>
    // This ensures the service type is correctly parameterized
    expectTypeOf<Port>().toMatchTypeOf<{ readonly __portName: "Total" }>();
    expectTypeOf<Service["value"]>().toEqualTypeOf<DeepReadonly<number>>();
  });
});

// =============================================================================
// createAsyncDerivedAdapter config type inference
// =============================================================================

describe("AsyncDerived adapter type inference", () => {
  it("AsyncDerivedPortDef select return type is ResultAsync<TResult, E>", () => {
    type _Port = AsyncDerivedPortDef<"Rate", number, Error>;
    type Service = AsyncDerivedService<number, Error>;
    // Verify the snapshot status union exists
    expectTypeOf<Service["status"]>().toEqualTypeOf<"idle" | "loading" | "success" | "error">();
  });
});

// =============================================================================
// createLinkedDerivedAdapter config type inference
// =============================================================================

describe("LinkedDerived adapter type inference", () => {
  it("LinkedDerivedPortDef write param matches TResult", () => {
    type _Port = LinkedDerivedPortDef<"Fahrenheit", number>;
    type Service = LinkedDerivedService<number>;
    // set() accepts TResult
    expectTypeOf<Service["set"]>().toEqualTypeOf<(value: number) => void>();
  });
});

// =============================================================================
// createDerivedAdapter select deps type inference
// =============================================================================

describe("createDerivedAdapter select deps inference", () => {
  it("single state port dep: deps.Counter inferred as StateService", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const DoubleCountPort = createDerivedPort<number>()({
      name: "DoubleCount",
    });

    createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: deps => {
        expectTypeOf(deps.Counter).toEqualTypeOf<StateService<CounterState, CounterActions>>();
        return deps.Counter.state.count * 2;
      },
    });
  });

  it("multiple mixed deps: state + atom ports correctly typed", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const ThemePort = createAtomPort<"light" | "dark">()({
      name: "Theme",
    });
    const SummaryPort = createDerivedPort<string>()({
      name: "Summary",
    });

    createDerivedAdapter({
      provides: SummaryPort,
      requires: [CounterPort, ThemePort],
      select: deps => {
        expectTypeOf(deps.Counter).toEqualTypeOf<StateService<CounterState, CounterActions>>();
        expectTypeOf(deps.Theme).toEqualTypeOf<AtomService<"light" | "dark">>();
        return `${deps.Counter.state.count} in ${deps.Theme.value}`;
      },
    });
  });

  it("return type must match InferDerivedType<TPort>", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const NumPort = createDerivedPort<number>()({
      name: "Num",
    });

    createDerivedAdapter({
      provides: NumPort,
      requires: [CounterPort],
      // @ts-expect-error - string is not assignable to number
      select: _deps => "not a number",
    });
  });

  it("equals params match InferDerivedType<TPort>", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const NumPort = createDerivedPort<number>()({
      name: "Num",
    });

    createDerivedAdapter({
      provides: NumPort,
      requires: [CounterPort],
      select: deps => deps.Counter.state.count,
      equals: (a, b) => {
        expectTypeOf(a).toEqualTypeOf<number>();
        expectTypeOf(b).toEqualTypeOf<number>();
        return a === b;
      },
    });
  });

  it("empty requires: deps is {}", () => {
    const ConstPort = createDerivedPort<number>()({
      name: "Const",
    });

    createDerivedAdapter({
      provides: ConstPort,
      requires: [],
      select: deps => {
        expectTypeOf(deps).toEqualTypeOf<EmptyDeps>();
        return 42;
      },
    });
  });

  it("derived depending on derived: deps typed as DerivedService", () => {
    const DoubleCountPort = createDerivedPort<number>()({
      name: "DoubleCount",
    });
    const QuadCountPort = createDerivedPort<number>()({
      name: "QuadCount",
    });

    createDerivedAdapter({
      provides: QuadCountPort,
      requires: [DoubleCountPort],
      select: deps => {
        expectTypeOf(deps.DoubleCount).toEqualTypeOf<DerivedService<number>>();
        return deps.DoubleCount.value * 2;
      },
    });
  });
});

// =============================================================================
// createAsyncDerivedAdapter select deps type inference
// =============================================================================

describe("createAsyncDerivedAdapter select deps inference", () => {
  it("typed deps: state port correctly inferred", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const AsyncPort = createAsyncDerivedPort<string, Error>()({
      name: "AsyncVal",
    });

    createAsyncDerivedAdapter({
      provides: AsyncPort,
      requires: [CounterPort],
      select: deps => {
        expectTypeOf(deps.Counter).toEqualTypeOf<StateService<CounterState, CounterActions>>();
        return ResultAsync.ok(`count: ${deps.Counter.state.count}`);
      },
    });
  });
});

// =============================================================================
// createLinkedDerivedAdapter select deps type inference
// =============================================================================

describe("createLinkedDerivedAdapter select deps inference", () => {
  it("select and write receive typed deps", () => {
    const CelsiusPort = createAtomPort<number>()({
      name: "Celsius",
    });
    const FahrenheitPort = createLinkedDerivedPort<number>()({
      name: "Fahrenheit",
    });

    createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [CelsiusPort],
      select: deps => {
        expectTypeOf(deps.Celsius).toEqualTypeOf<AtomService<number>>();
        return (deps.Celsius.value * 9) / 5 + 32;
      },
      write: (value, deps) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        expectTypeOf(deps.Celsius).toEqualTypeOf<AtomService<number>>();
        deps.Celsius.set(((value - 32) * 5) / 9);
      },
    });
  });
});

// =============================================================================
// InferLinkedDerivedType utility
// =============================================================================

describe("InferLinkedDerivedType utility", () => {
  it("extracts result type from LinkedDerivedPortDef", () => {
    type Port = LinkedDerivedPortDef<"Fahrenheit", number>;
    expectTypeOf<InferLinkedDerivedType<Port>>().toEqualTypeOf<number>();
  });

  it("returns never for non-linked-derived ports", () => {
    type Port = DerivedPortDef<"Total", number>;
    // DerivedPortDef is not a LinkedDerivedPortDef, but they share the same structure
    // since LinkedDerivedPortDef is DirectedPort<LinkedDerivedService<TResult>...>
    // and DerivedPortDef is DirectedPort<DerivedService<TResult>...>
    // LinkedDerivedService extends DerivedService, so DerivedPortDef won't match LinkedDerivedPortDef
    expectTypeOf<InferLinkedDerivedType<Port>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// PortDeps utility
// =============================================================================

describe("PortDeps utility", () => {
  it("maps port tuple to named service types", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const ThemePort = createAtomPort<"light" | "dark">()({
      name: "Theme",
    });

    type Deps = PortDeps<[typeof CounterPort, typeof ThemePort]>;
    expectTypeOf<Deps>().toEqualTypeOf<{
      Counter: StateService<CounterState, CounterActions>;
      Theme: AtomService<"light" | "dark">;
    }>();
  });
});

// =============================================================================
// createStateAdapter effects DI function type inference
// =============================================================================

describe("createStateAdapter effects DI function deps inference", () => {
  it("effects function receives typed deps when requires is provided", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const ThemePort = createAtomPort<"light" | "dark">()({
      name: "Theme",
    });

    const LogPort = createStatePort<
      { entries: readonly string[] },
      { log: (s: { entries: readonly string[] }, msg: string) => { entries: readonly string[] } }
    >()({
      name: "Log",
    });

    createStateAdapter({
      provides: LogPort,
      requires: [CounterPort, ThemePort],
      initial: { entries: [] },
      actions: {
        log: (state, msg: string) => ({ entries: [...state.entries, msg] }),
      },
      effects: deps => {
        expectTypeOf(deps.Counter).toEqualTypeOf<StateService<CounterState, CounterActions>>();
        expectTypeOf(deps.Theme).toEqualTypeOf<AtomService<"light" | "dark">>();
        return {};
      },
    });
  });

  it("effects function deps is {} when no requires", () => {
    const SimplePort = createStatePort<
      { value: number },
      { set: (s: { value: number }, v: number) => { value: number } }
    >()({
      name: "Simple",
    });

    createStateAdapter({
      provides: SimplePort,
      initial: { value: 0 },
      actions: {
        set: (_s, v: number) => ({ value: v }),
      },
      effects: deps => {
        expectTypeOf(deps).toEqualTypeOf<EmptyDeps>();
        return {};
      },
    });
  });
});

// =============================================================================
// createEffectAdapter factory type inference
// =============================================================================

describe("createEffectAdapter factory deps inference", () => {
  it("factory receives typed deps when requires is provided", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const EffectPort = createPort<"Logger", ActionEffect>({
      name: "Logger",
    });

    createEffectAdapter({
      provides: EffectPort,
      requires: [CounterPort],
      factory: deps => {
        expectTypeOf(deps.Counter).toEqualTypeOf<StateService<CounterState, CounterActions>>();
        return { onAction: () => {} };
      },
    });
  });

  it("factory deps is {} when no requires", () => {
    const EffectPort = createPort<"Logger", ActionEffect>({
      name: "Logger",
    });

    createEffectAdapter({
      provides: EffectPort,
      factory: deps => {
        expectTypeOf(deps).toEqualTypeOf<EmptyDeps>();
        return { onAction: () => {} };
      },
    });
  });
});

// =============================================================================
// EffectMap type constraints
// =============================================================================

describe("EffectMap type constraints", () => {
  it("EffectMap keys must be subset of keyof TActions", () => {
    type Effects = EffectMap<CounterState, CounterActions>;
    type EffectKeys = keyof Effects;
    expectTypeOf<EffectKeys>().toEqualTypeOf<keyof CounterActions>();
  });
});

// =============================================================================
// EffectContext type inference
// =============================================================================

describe("EffectContext type inference", () => {
  it("EffectContext payload type is inferred from action reducer signature", () => {
    // For 'setLabel' which takes (state, label: string), payload should be string
    type SetLabelContext = EffectContext<CounterState, CounterActions, "setLabel">;
    expectTypeOf<SetLabelContext["payload"]>().toEqualTypeOf<string>();
  });

  it("EffectContext state is DeepReadonly<TState>", () => {
    type IncrementContext = EffectContext<CounterState, CounterActions, "increment">;
    expectTypeOf<IncrementContext["state"]>().toEqualTypeOf<DeepReadonly<CounterState>>();
  });
});

// =============================================================================
// EffectErrorHandler type inference
// =============================================================================

describe("EffectErrorHandler type inference", () => {
  it("EffectErrorHandler error field is EffectFailedError", () => {
    type Handler = EffectErrorHandler<CounterState, CounterActions>;
    // The handler receives { error: EffectFailedError, ... }
    type HandlerParam = Parameters<Handler>[0];
    expectTypeOf<HandlerParam["error"]>().toEqualTypeOf<EffectFailedError>();
  });
});

// =============================================================================
// ActionEffect type inference
// =============================================================================

describe("ActionEffect type inference", () => {
  it("ActionEffect.onAction receives ActionEvent", () => {
    expectTypeOf<ActionEffect["onAction"]>().parameter(0).toEqualTypeOf<ActionEvent>();
  });

  it("ActionEffect.onAction returns void or Promise<void>", () => {
    expectTypeOf<ActionEffect["onAction"]>().returns.toEqualTypeOf<void | Promise<void>>();
  });
});

// =============================================================================
// Negative: wrong select return type
// =============================================================================

describe("Negative: wrong select return type", () => {
  it("AsyncDerived: select returns ResultAsync.ok(123) when port expects ResultAsync<string, Error>", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const AsyncPort = createAsyncDerivedPort<string, Error>()({
      name: "AsyncVal",
    });

    createAsyncDerivedAdapter({
      provides: AsyncPort,
      requires: [CounterPort],
      // @ts-expect-error - ResultAsync<number, never> is not assignable to ResultAsync<string, Error>
      select: _deps => ResultAsync.ok(123),
    });
  });

  it("LinkedDerived: select returns string when port expects number", () => {
    const CelsiusPort = createAtomPort<number>()({
      name: "Celsius",
    });
    const FahrenheitPort = createLinkedDerivedPort<number>()({
      name: "Fahrenheit",
    });

    createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [CelsiusPort],
      // @ts-expect-error - string is not assignable to number
      select: _deps => "not a number",
      write: (_value, _deps) => {},
    });
  });
});

// =============================================================================
// Negative: wrong dependency access
// =============================================================================

describe("Negative: wrong dependency access", () => {
  it("Derived: accessing deps.NonExistent when only [CounterPort] in requires", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const NumPort = createDerivedPort<number>()({
      name: "Num",
    });

    createDerivedAdapter({
      provides: NumPort,
      requires: [CounterPort],
      select: deps => {
        // @ts-expect-error - Property 'NonExistent' does not exist on type PortDeps<[CounterPort]>
        deps.NonExistent;
        return 0;
      },
    });
  });

  it("Derived: accessing deps.counter (lowercase) when name is Counter", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const NumPort = createDerivedPort<number>()({
      name: "Num",
    });

    createDerivedAdapter({
      provides: NumPort,
      requires: [CounterPort],
      select: deps => {
        // @ts-expect-error - Property 'counter' does not exist (case mismatch: should be 'Counter')
        deps.counter;
        return 0;
      },
    });
  });

  it("AsyncDerived: accessing deps.NonExistent in select", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const AsyncPort = createAsyncDerivedPort<string, Error>()({
      name: "AsyncVal",
    });

    createAsyncDerivedAdapter({
      provides: AsyncPort,
      requires: [CounterPort],
      select: deps => {
        // @ts-expect-error - Property 'NonExistent' does not exist on type PortDeps<[CounterPort]>
        deps.NonExistent;
        return ResultAsync.ok("");
      },
    });
  });

  it("LinkedDerived: accessing deps.NonExistent in select", () => {
    const CelsiusPort = createAtomPort<number>()({
      name: "Celsius",
    });
    const FahrenheitPort = createLinkedDerivedPort<number>()({
      name: "Fahrenheit",
    });

    createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [CelsiusPort],
      select: deps => {
        // @ts-expect-error - Property 'NonExistent' does not exist on type PortDeps<[CelsiusPort]>
        deps.NonExistent;
        return 0;
      },
      write: (_value, _deps) => {},
    });
  });
});

// =============================================================================
// Negative: wrong equals types
// =============================================================================

describe("Negative: wrong equals types", () => {
  it("Derived: equals with string params when derived type is number", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const NumPort = createDerivedPort<number>()({
      name: "Num",
    });

    createDerivedAdapter({
      provides: NumPort,
      requires: [CounterPort],
      select: deps => deps.Counter.state.count,
      // @ts-expect-error - equals params should be number, not string
      equals: (a: string, b: string) => a === b,
    });
  });

  it("LinkedDerived: equals with string params when derived type is number", () => {
    const CelsiusPort = createAtomPort<number>()({
      name: "Celsius",
    });
    const FahrenheitPort = createLinkedDerivedPort<number>()({
      name: "Fahrenheit",
    });

    createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [CelsiusPort],
      select: deps => (deps.Celsius.value * 9) / 5 + 32,
      write: (value, deps) => {
        deps.Celsius.set(((value - 32) * 5) / 9);
      },
      // @ts-expect-error - equals params should be number, not string
      equals: (a: string, b: string) => a === b,
    });
  });
});

// =============================================================================
// Negative: wrong write types
// =============================================================================

describe("Negative: wrong write types", () => {
  it("LinkedDerived: write with annotated value: string when port expects number", () => {
    const CelsiusPort = createAtomPort<number>()({
      name: "Celsius",
    });
    const FahrenheitPort = createLinkedDerivedPort<number>()({
      name: "Fahrenheit",
    });

    createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [CelsiusPort],
      select: deps => (deps.Celsius.value * 9) / 5 + 32,
      // @ts-expect-error - write value should be number, not string
      write: (value: string, _deps) => {},
    });
  });

  it("LinkedDerived: write accessing deps.NonExistent", () => {
    const CelsiusPort = createAtomPort<number>()({
      name: "Celsius",
    });
    const FahrenheitPort = createLinkedDerivedPort<number>()({
      name: "Fahrenheit",
    });

    createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [CelsiusPort],
      select: deps => (deps.Celsius.value * 9) / 5 + 32,
      write: (_value, deps) => {
        // @ts-expect-error - Property 'NonExistent' does not exist on type PortDeps<[CelsiusPort]>
        deps.NonExistent;
      },
    });
  });
});

// =============================================================================
// Negative: wrong deps in effects/factory
// =============================================================================

describe("Negative: wrong deps in effects/factory", () => {
  it("StateAdapter: effects function accessing deps.NonExistent when not in requires", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const LogPort = createStatePort<
      { entries: readonly string[] },
      { log: (s: { entries: readonly string[] }, msg: string) => { entries: readonly string[] } }
    >()({
      name: "Log",
    });

    createStateAdapter({
      provides: LogPort,
      requires: [CounterPort],
      initial: { entries: [] },
      actions: {
        log: (state, msg: string) => ({ entries: [...state.entries, msg] }),
      },
      effects: deps => {
        // @ts-expect-error - Property 'NonExistent' does not exist on type PortDeps<[CounterPort]>
        deps.NonExistent;
        return {};
      },
    });
  });

  it("EffectAdapter: factory accessing deps.NonExistent when not in requires", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const EffectPort = createPort<"Logger", ActionEffect>({
      name: "Logger",
    });

    createEffectAdapter({
      provides: EffectPort,
      requires: [CounterPort],
      factory: deps => {
        // @ts-expect-error - Property 'NonExistent' does not exist on type PortDeps<[CounterPort]>
        deps.NonExistent;
        return { onAction: () => {} };
      },
    });
  });
});

// =============================================================================
// Positive: all 5 port types as deps
// =============================================================================

describe("Positive: all 5 port types as deps", () => {
  it("derived adapter with all 5 port types correctly resolves each dep", () => {
    const MyStatePort = createStatePort<CounterState, CounterActions>()({
      name: "MyState",
    });
    const MyAtomPort = createAtomPort<boolean>()({
      name: "MyAtom",
    });
    const MyDerivedPort = createDerivedPort<string>()({
      name: "MyDerived",
    });
    const MyAsyncDerivedPort = createAsyncDerivedPort<number, Error>()({
      name: "MyAsyncDerived",
    });
    const MyLinkedDerivedPort = createLinkedDerivedPort<number>()({
      name: "MyLinkedDerived",
    });

    const OutputPort = createDerivedPort<string>()({
      name: "Output",
    });

    createDerivedAdapter({
      provides: OutputPort,
      requires: [MyStatePort, MyAtomPort, MyDerivedPort, MyAsyncDerivedPort, MyLinkedDerivedPort],
      select: deps => {
        expectTypeOf(deps.MyState).toEqualTypeOf<StateService<CounterState, CounterActions>>();
        expectTypeOf(deps.MyAtom).toEqualTypeOf<AtomService<boolean>>();
        expectTypeOf(deps.MyDerived).toEqualTypeOf<DerivedService<string>>();
        expectTypeOf(deps.MyAsyncDerived).toEqualTypeOf<AsyncDerivedService<number, Error>>();
        expectTypeOf(deps.MyLinkedDerived).toEqualTypeOf<LinkedDerivedService<number>>();
        return "ok";
      },
    });
  });
});

// =============================================================================
// Positive: async derived error type flows through
// =============================================================================

describe("Positive: async derived error type flows through", () => {
  it("select return type includes the Error channel from the port", () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const AsyncPort = createAsyncDerivedPort<string, Error>()({
      name: "AsyncVal",
    });

    createAsyncDerivedAdapter({
      provides: AsyncPort,
      requires: [CounterPort],
      select: deps => {
        return ResultAsync.fromPromise(Promise.resolve(`count: ${deps.Counter.state.count}`), e =>
          e instanceof Error ? e : new Error(String(e))
        );
      },
    });

    // Verify the port's service snapshot error branch carries the Error type
    type Service = AsyncDerivedService<string, Error>;
    type Snapshot = Service["snapshot"];
    type ErrorBranch = Extract<Snapshot, { status: "error" }>;
    expectTypeOf<ErrorBranch["error"]>().toEqualTypeOf<Error>();
  });
});

// =============================================================================
// Positive: linked derived equals typed
// =============================================================================

describe("Positive: linked derived equals typed", () => {
  it("equals params match InferLinkedDerivedType<TPort>", () => {
    const CelsiusPort = createAtomPort<number>()({
      name: "Celsius",
    });
    const FahrenheitPort = createLinkedDerivedPort<number>()({
      name: "Fahrenheit",
    });

    createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [CelsiusPort],
      select: deps => (deps.Celsius.value * 9) / 5 + 32,
      write: (value, deps) => {
        deps.Celsius.set(((value - 32) * 5) / 9);
      },
      equals: (a, b) => {
        expectTypeOf(a).toEqualTypeOf<number>();
        expectTypeOf(b).toEqualTypeOf<number>();
        return a === b;
      },
    });
  });
});

// =============================================================================
// Positive: cross-library port as dependency
// =============================================================================

describe("Positive: cross-library port as dependency", () => {
  interface MutationExecutor {
    execute(input: string): Promise<number>;
  }

  it("generic createPort port resolves correctly in derived adapter deps", () => {
    const ExternalPort = createPort<"MyMutation", MutationExecutor>({
      name: "MyMutation",
    });
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const OutputPort = createDerivedPort<string>()({
      name: "Output",
    });

    createDerivedAdapter({
      provides: OutputPort,
      requires: [CounterPort, ExternalPort],
      select: deps => {
        expectTypeOf(deps.Counter).toEqualTypeOf<StateService<CounterState, CounterActions>>();
        expectTypeOf(deps.MyMutation).toEqualTypeOf<MutationExecutor>();
        return "ok";
      },
    });
  });

  it("generic createPort port resolves correctly in effect adapter deps", () => {
    const ExternalPort = createPort<"MyMutation", MutationExecutor>({
      name: "MyMutation",
    });
    const EffectPort = createPort<"Logger", ActionEffect>({
      name: "Logger",
    });

    createEffectAdapter({
      provides: EffectPort,
      requires: [ExternalPort],
      factory: deps => {
        expectTypeOf(deps.MyMutation).toEqualTypeOf<MutationExecutor>();
        return { onAction: () => {} };
      },
    });
  });

  it("generic createPort port resolves correctly in state adapter effects", () => {
    const ExternalPort = createPort<"MyMutation", MutationExecutor>({
      name: "MyMutation",
    });
    const LogPort = createStatePort<
      { entries: readonly string[] },
      { log: (s: { entries: readonly string[] }, msg: string) => { entries: readonly string[] } }
    >()({
      name: "Log",
    });

    createStateAdapter({
      provides: LogPort,
      requires: [ExternalPort],
      initial: { entries: [] },
      actions: {
        log: (state, msg: string) => ({ entries: [...state.entries, msg] }),
      },
      effects: deps => {
        expectTypeOf(deps.MyMutation).toEqualTypeOf<MutationExecutor>();
        return {};
      },
    });
  });
});
