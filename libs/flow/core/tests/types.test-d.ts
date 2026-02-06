/**
 * Type-level tests for State, Event, and Machine branded types.
 *
 * These tests verify:
 * 1. State brand encodes name and context
 * 2. Event brand encodes name and payload
 * 3. Conditional context/payload inclusion
 * 4. DeepReadonly enforcement
 * 5. Type narrowing via discriminated union
 * 6. Type inference utilities work correctly
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  type State,
  type Event,
  type DeepReadonly,
  type InferStateName,
  type InferStateContext,
  type InferEventName,
  type InferEventPayload,
  state,
  event,
} from "../src/machine/index.js";

// =============================================================================
// Test 1: State Brand Encodes Name and Context
// =============================================================================

describe("State brand encodes name and context", () => {
  it("State type has name property as literal type", () => {
    type IdleState = State<"idle">;

    expectTypeOf<IdleState["name"]>().toEqualTypeOf<"idle">();
  });

  it("State type encodes context type in brand", () => {
    interface UserContext {
      name: string;
      age: number;
    }

    type LoggedInState = State<"loggedIn", UserContext>;

    // InferStateContext should extract the context type
    type ExtractedContext = InferStateContext<LoggedInState>;
    expectTypeOf<ExtractedContext>().toEqualTypeOf<UserContext>();
  });

  it("different state names produce incompatible types", () => {
    type StateA = State<"stateA">;
    type StateB = State<"stateB">;

    // States with different names are not assignable to each other
    expectTypeOf<StateA>().not.toEqualTypeOf<StateB>();
  });

  it("same state name with different contexts produce incompatible types", () => {
    type StateWithNumber = State<"loading", { progress: number }>;
    type StateWithString = State<"loading", { message: string }>;

    // Same name, different context = different types
    expectTypeOf<StateWithNumber>().not.toEqualTypeOf<StateWithString>();
  });

  it("InferStateName extracts the state name literal type", () => {
    type LoadingState = State<"loading", { progress: number }>;

    type ExtractedName = InferStateName<LoadingState>;
    expectTypeOf<ExtractedName>().toEqualTypeOf<"loading">();
  });
});

// =============================================================================
// Test 2: Event Brand Encodes Name and Payload
// =============================================================================

describe("Event brand encodes name and payload", () => {
  it("Event type has type property as literal type", () => {
    type ClickEvent = Event<"CLICK">;

    expectTypeOf<ClickEvent["type"]>().toEqualTypeOf<"CLICK">();
  });

  it("Event type encodes payload type in brand", () => {
    interface SubmitPayload {
      formData: Record<string, string>;
    }

    type SubmitEvent = Event<"SUBMIT", SubmitPayload>;

    // InferEventPayload should extract the payload type
    type ExtractedPayload = InferEventPayload<SubmitEvent>;
    expectTypeOf<ExtractedPayload>().toEqualTypeOf<SubmitPayload>();
  });

  it("different event types produce incompatible types", () => {
    type EventA = Event<"EVENT_A">;
    type EventB = Event<"EVENT_B">;

    expectTypeOf<EventA>().not.toEqualTypeOf<EventB>();
  });

  it("same event type with different payloads produce incompatible types", () => {
    type EventWithNumber = Event<"DATA", number>;
    type EventWithString = Event<"DATA", string>;

    expectTypeOf<EventWithNumber>().not.toEqualTypeOf<EventWithString>();
  });

  it("InferEventName extracts the event type literal", () => {
    type ResetEvent = Event<"RESET", { hard: boolean }>;

    type ExtractedName = InferEventName<ResetEvent>;
    expectTypeOf<ExtractedName>().toEqualTypeOf<"RESET">();
  });
});

// =============================================================================
// Test 3: Conditional Context/Payload Inclusion
// =============================================================================

describe("conditional context/payload inclusion", () => {
  it("State without context does not have context property", () => {
    type IdleState = State<"idle">;

    // State<"idle"> should NOT have a context property
    // We check by seeing if 'context' extends keyof State
    type HasContext = "context" extends keyof IdleState ? true : false;
    expectTypeOf<HasContext>().toEqualTypeOf<false>();
  });

  it("State with context has readonly context property", () => {
    interface Data {
      value: number;
    }
    type DataState = State<"data", Data>;

    // State<"data", Data> should have a context property
    type HasContext = "context" extends keyof DataState ? true : false;
    expectTypeOf<HasContext>().toEqualTypeOf<true>();

    // Context should be DeepReadonly
    expectTypeOf<DataState["context"]>().toMatchTypeOf<{ readonly value: number }>();
  });

  it("Event without payload does not have payload property", () => {
    type ResetEvent = Event<"RESET">;

    // Event<"RESET"> should NOT have a payload property
    type HasPayload = "payload" extends keyof ResetEvent ? true : false;
    expectTypeOf<HasPayload>().toEqualTypeOf<false>();
  });

  it("Event with payload has readonly payload property", () => {
    interface Payload {
      data: string;
    }
    type DataEvent = Event<"DATA", Payload>;

    // Event<"DATA", Payload> should have a payload property
    type HasPayload = "payload" extends keyof DataEvent ? true : false;
    expectTypeOf<HasPayload>().toEqualTypeOf<true>();

    expectTypeOf<DataEvent["payload"]>().toMatchTypeOf<Payload>();
  });
});

// =============================================================================
// Test 4: DeepReadonly Enforcement
// =============================================================================

describe("DeepReadonly enforcement", () => {
  it("makes nested objects readonly", () => {
    interface NestedData {
      user: {
        profile: {
          name: string;
          settings: {
            theme: string;
          };
        };
      };
    }

    type ReadonlyNestedData = DeepReadonly<NestedData>;

    // All levels should be readonly
    expectTypeOf<ReadonlyNestedData>().toMatchTypeOf<{
      readonly user: {
        readonly profile: {
          readonly name: string;
          readonly settings: {
            readonly theme: string;
          };
        };
      };
    }>();
  });

  it("makes arrays readonly", () => {
    interface WithArray {
      items: string[];
      nested: { values: number[] };
    }

    type ReadonlyWithArray = DeepReadonly<WithArray>;

    // Arrays should become ReadonlyArray
    expectTypeOf<ReadonlyWithArray>().toMatchTypeOf<{
      readonly items: ReadonlyArray<string>;
      readonly nested: {
        readonly values: ReadonlyArray<number>;
      };
    }>();
  });

  it("handles primitives correctly", () => {
    type ReadonlyString = DeepReadonly<string>;
    type ReadonlyNumber = DeepReadonly<number>;
    type ReadonlyBoolean = DeepReadonly<boolean>;

    // Primitives should pass through unchanged
    expectTypeOf<ReadonlyString>().toEqualTypeOf<string>();
    expectTypeOf<ReadonlyNumber>().toEqualTypeOf<number>();
    expectTypeOf<ReadonlyBoolean>().toEqualTypeOf<boolean>();
  });

  it("state context is DeepReadonly", () => {
    interface MutableContext {
      users: { name: string; items: string[] }[];
    }

    type UserState = State<"users", MutableContext>;

    // The context should be deeply readonly
    expectTypeOf<UserState["context"]>().toMatchTypeOf<{
      readonly users: ReadonlyArray<{
        readonly name: string;
        readonly items: ReadonlyArray<string>;
      }>;
    }>();
  });
});

// =============================================================================
// Test 5: Type Narrowing via Discriminated Union
// =============================================================================

describe("type narrowing via discriminated union", () => {
  it("can narrow state union by name property", () => {
    type IdleState = State<"idle">;
    type LoadingState = State<"loading", { progress: number }>;
    type SuccessState = State<"success", { data: string }>;

    type AnyState = IdleState | LoadingState | SuccessState;

    // Function that narrows the state
    const narrowState = (s: AnyState) => {
      if (s.name === "loading") {
        // TypeScript should narrow to LoadingState
        expectTypeOf(s).toMatchTypeOf<LoadingState>();
        expectTypeOf(s.context.progress).toEqualTypeOf<number>();
      } else if (s.name === "success") {
        // TypeScript should narrow to SuccessState
        expectTypeOf(s).toMatchTypeOf<SuccessState>();
        expectTypeOf(s.context.data).toEqualTypeOf<string>();
      } else {
        // TypeScript should narrow to IdleState
        expectTypeOf(s).toMatchTypeOf<IdleState>();
      }
    };

    // Verify the function type-checks (function itself doesn't need to be called)
    expectTypeOf(narrowState).toBeFunction();
  });

  it("can narrow event union by type property", () => {
    type ClickEvent = Event<"CLICK">;
    type SubmitEvent = Event<"SUBMIT", { formId: string }>;
    type ResetEvent = Event<"RESET">;

    type AnyEvent = ClickEvent | SubmitEvent | ResetEvent;

    // Function that narrows the event
    const narrowEvent = (e: AnyEvent) => {
      if (e.type === "SUBMIT") {
        // TypeScript should narrow to SubmitEvent
        expectTypeOf(e).toMatchTypeOf<SubmitEvent>();
        expectTypeOf(e.payload.formId).toEqualTypeOf<string>();
      }
    };

    expectTypeOf(narrowEvent).toBeFunction();
  });
});

// =============================================================================
// Test 6: Factory Functions Return Correct Types
// =============================================================================

describe("state and event factory functions", () => {
  it("state factory returns correct State type without context", () => {
    const createIdle = state<"idle">("idle");
    const idleState = createIdle();

    expectTypeOf(idleState).toMatchTypeOf<State<"idle">>();
    expectTypeOf(idleState.name).toEqualTypeOf<"idle">();
  });

  it("state factory returns correct State type with context", () => {
    interface LoadingContext {
      progress: number;
    }

    const createLoading = state<"loading", LoadingContext>("loading");
    const loadingState = createLoading({ progress: 50 });

    expectTypeOf(loadingState).toMatchTypeOf<State<"loading", LoadingContext>>();
    expectTypeOf(loadingState.name).toEqualTypeOf<"loading">();
    expectTypeOf(loadingState.context).toMatchTypeOf<{ readonly progress: number }>();
  });

  it("event factory returns correct Event type without payload", () => {
    const createReset = event<"RESET">("RESET");
    const resetEvent = createReset();

    expectTypeOf(resetEvent).toMatchTypeOf<Event<"RESET">>();
    expectTypeOf(resetEvent.type).toEqualTypeOf<"RESET">();
  });

  it("event factory returns correct Event type with payload", () => {
    interface SubmitPayload {
      formId: string;
    }

    const createSubmit = event<"SUBMIT", SubmitPayload>("SUBMIT");
    const submitEvent = createSubmit({ formId: "login" });

    expectTypeOf(submitEvent).toMatchTypeOf<Event<"SUBMIT", SubmitPayload>>();
    expectTypeOf(submitEvent.type).toEqualTypeOf<"SUBMIT">();
    expectTypeOf(submitEvent.payload).toMatchTypeOf<SubmitPayload>();
  });
});
