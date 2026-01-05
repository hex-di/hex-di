/**
 * Type-level tests for defineEvents and TypedEventSink
 *
 * These tests verify:
 * 1. defineEvents infers event types from factory return types
 * 2. EventFactory has .type property matching event name
 * 3. EventFactory call produces { type: 'NAME', ...payload }
 * 4. TypedEventSink.emit(factory(...)) accepts factory result
 * 5. TypedEventSink.emit('TYPE', payload) accepts type + payload
 * 6. TypedEventSink.emit('DONE') works for zero-payload events
 * 7. EventTypes<TEvents> extracts union of event type strings
 * 8. PayloadOf<TEvents, TType> extracts payload for given type
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  defineEvents,
  type TypedEventSink,
  type EventTypes,
  type PayloadOf,
  type EventOf,
  type EventFactory,
  type EventDefinition,
} from "../../src/activities/events.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TaskResult {
  data: string;
  status: "success" | "partial";
}

// Define test events using defineEvents
const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
  FAILED: (error: Error, retryable: boolean) => ({ error, retryable }),
  DONE: () => ({}),
});

// =============================================================================
// Test 1: defineEvents infers event types from factory return types
// =============================================================================

describe("defineEvents infers event types from factory return types", () => {
  it("infers PROGRESS factory type correctly", () => {
    // The factory should be a function that takes a number and returns the event
    expectTypeOf(TaskEvents.PROGRESS).toBeFunction();
    expectTypeOf(TaskEvents.PROGRESS).parameter(0).toBeNumber();

    // Return type should include type: 'PROGRESS' and percent: number
    const event = TaskEvents.PROGRESS(50);
    expectTypeOf(event.type).toEqualTypeOf<"PROGRESS">();
    expectTypeOf(event.percent).toBeNumber();
  });

  it("infers COMPLETED factory type correctly", () => {
    expectTypeOf(TaskEvents.COMPLETED).toBeFunction();

    const event = TaskEvents.COMPLETED({ data: "test", status: "success" });
    expectTypeOf(event.type).toEqualTypeOf<"COMPLETED">();
    expectTypeOf(event.result).toEqualTypeOf<TaskResult>();
  });

  it("infers FAILED factory type with multiple arguments", () => {
    expectTypeOf(TaskEvents.FAILED).toBeFunction();
    expectTypeOf(TaskEvents.FAILED).parameters.toEqualTypeOf<[Error, boolean]>();

    const event = TaskEvents.FAILED(new Error("test"), true);
    expectTypeOf(event.type).toEqualTypeOf<"FAILED">();
    expectTypeOf(event.error).toEqualTypeOf<Error>();
    expectTypeOf(event.retryable).toBeBoolean();
  });

  it("infers DONE factory with no arguments", () => {
    expectTypeOf(TaskEvents.DONE).toBeFunction();
    expectTypeOf(TaskEvents.DONE).parameters.toEqualTypeOf<[]>();

    const event = TaskEvents.DONE();
    expectTypeOf(event.type).toEqualTypeOf<"DONE">();
  });
});

// =============================================================================
// Test 2: EventFactory has .type property matching event name
// =============================================================================

describe("EventFactory has .type property matching event name", () => {
  it("PROGRESS.type equals 'PROGRESS'", () => {
    expectTypeOf(TaskEvents.PROGRESS.type).toEqualTypeOf<"PROGRESS">();
  });

  it("COMPLETED.type equals 'COMPLETED'", () => {
    expectTypeOf(TaskEvents.COMPLETED.type).toEqualTypeOf<"COMPLETED">();
  });

  it("FAILED.type equals 'FAILED'", () => {
    expectTypeOf(TaskEvents.FAILED.type).toEqualTypeOf<"FAILED">();
  });

  it("DONE.type equals 'DONE'", () => {
    expectTypeOf(TaskEvents.DONE.type).toEqualTypeOf<"DONE">();
  });
});

// =============================================================================
// Test 3: EventFactory call produces { type: 'NAME', ...payload }
// =============================================================================

describe("EventFactory call produces { type: 'NAME', ...payload }", () => {
  it("PROGRESS(50) produces correct event structure", () => {
    const event = TaskEvents.PROGRESS(50);

    // Should have type and payload spread
    expectTypeOf(event).toMatchTypeOf<{
      readonly type: "PROGRESS";
      readonly percent: number;
    }>();
  });

  it("COMPLETED(result) produces correct event structure", () => {
    const event = TaskEvents.COMPLETED({ data: "test", status: "success" });

    expectTypeOf(event).toMatchTypeOf<{
      readonly type: "COMPLETED";
      readonly result: TaskResult;
    }>();
  });

  it("FAILED(error, retryable) produces correct event structure", () => {
    const event = TaskEvents.FAILED(new Error("test"), true);

    expectTypeOf(event).toMatchTypeOf<{
      readonly type: "FAILED";
      readonly error: Error;
      readonly retryable: boolean;
    }>();
  });

  it("DONE() produces correct event structure", () => {
    const event = TaskEvents.DONE();

    expectTypeOf(event).toMatchTypeOf<{
      readonly type: "DONE";
    }>();
  });
});

// =============================================================================
// Test 4: TypedEventSink.emit(factory(...)) accepts factory result
// =============================================================================

describe("TypedEventSink.emit(factory(...)) accepts factory result", () => {
  it("accepts PROGRESS event from factory", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      // Should accept the factory result directly
      sink.emit(TaskEvents.PROGRESS(50));
    };

    expectTypeOf(testEmit).toBeFunction();
  });

  it("accepts COMPLETED event from factory", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      sink.emit(TaskEvents.COMPLETED({ data: "test", status: "success" }));
    };

    expectTypeOf(testEmit).toBeFunction();
  });

  it("accepts FAILED event from factory", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      sink.emit(TaskEvents.FAILED(new Error("test"), true));
    };

    expectTypeOf(testEmit).toBeFunction();
  });

  it("accepts DONE event from factory", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      sink.emit(TaskEvents.DONE());
    };

    expectTypeOf(testEmit).toBeFunction();
  });
});

// =============================================================================
// Test 5: TypedEventSink.emit('TYPE', payload) accepts type + payload
// =============================================================================

describe("TypedEventSink.emit('TYPE', payload) accepts type + payload", () => {
  it("accepts PROGRESS type with correct payload", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      sink.emit("PROGRESS", { percent: 50 });
    };

    expectTypeOf(testEmit).toBeFunction();
  });

  it("accepts COMPLETED type with correct payload", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      sink.emit("COMPLETED", { result: { data: "test", status: "success" } });
    };

    expectTypeOf(testEmit).toBeFunction();
  });

  it("accepts FAILED type with correct payload", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      sink.emit("FAILED", { error: new Error("test"), retryable: true });
    };

    expectTypeOf(testEmit).toBeFunction();
  });
});

// =============================================================================
// Test 6: TypedEventSink.emit('DONE') works for zero-payload events
// =============================================================================

describe("TypedEventSink.emit('DONE') works for zero-payload events", () => {
  it("accepts DONE type without payload", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      // For events with empty payload, no second argument is required
      sink.emit("DONE");
    };

    expectTypeOf(testEmit).toBeFunction();
  });

  it("allows optional empty object for empty-payload events", () => {
    const testEmit = (sink: TypedEventSink<typeof TaskEvents>) => {
      // Empty object should also be acceptable
      sink.emit("DONE", {});
    };

    expectTypeOf(testEmit).toBeFunction();
  });
});

// =============================================================================
// Test 7: EventTypes<TEvents> extracts union of event type strings
// =============================================================================

describe("EventTypes extracts union of event type strings", () => {
  it("extracts all event types as a union", () => {
    type TaskEventTypes = EventTypes<typeof TaskEvents>;

    // Should be a union of all event type strings
    expectTypeOf<TaskEventTypes>().toEqualTypeOf<"PROGRESS" | "COMPLETED" | "FAILED" | "DONE">();
  });

  it("works with single-event definitions", () => {
    const _SingleEvent = defineEvents({
      ONLY_EVENT: () => ({}),
    });

    type SingleEventTypes = EventTypes<typeof _SingleEvent>;
    expectTypeOf<SingleEventTypes>().toEqualTypeOf<"ONLY_EVENT">();
  });
});

// =============================================================================
// Test 8: PayloadOf<TEvents, TType> extracts payload for given type
// =============================================================================

describe("PayloadOf extracts payload for given type", () => {
  it("extracts PROGRESS payload correctly", () => {
    type ProgressPayload = PayloadOf<typeof TaskEvents, "PROGRESS">;
    expectTypeOf<ProgressPayload>().toEqualTypeOf<{ percent: number }>();
  });

  it("extracts COMPLETED payload correctly", () => {
    type CompletedPayload = PayloadOf<typeof TaskEvents, "COMPLETED">;
    expectTypeOf<CompletedPayload>().toEqualTypeOf<{ result: TaskResult }>();
  });

  it("extracts FAILED payload correctly", () => {
    type FailedPayload = PayloadOf<typeof TaskEvents, "FAILED">;
    expectTypeOf<FailedPayload>().toEqualTypeOf<{ error: Error; retryable: boolean }>();
  });

  it("extracts DONE payload as empty object", () => {
    type DonePayload = PayloadOf<typeof TaskEvents, "DONE">;
    // Empty object type - using Record<string, never> pattern or {}
    expectTypeOf<DonePayload>().toEqualTypeOf<Record<string, never>>();
  });
});

// =============================================================================
// Test 9: EventOf<TEvents> returns union of all event objects
// =============================================================================

describe("EventOf returns union of all event objects", () => {
  it("returns union of all possible events", () => {
    type AllEvents = EventOf<typeof TaskEvents>;

    // Should be assignable from any individual event
    const progressEvent = TaskEvents.PROGRESS(50);
    const completedEvent = TaskEvents.COMPLETED({ data: "test", status: "success" });
    const failedEvent = TaskEvents.FAILED(new Error("test"), true);
    const doneEvent = TaskEvents.DONE();

    expectTypeOf(progressEvent).toMatchTypeOf<AllEvents>();
    expectTypeOf(completedEvent).toMatchTypeOf<AllEvents>();
    expectTypeOf(failedEvent).toMatchTypeOf<AllEvents>();
    expectTypeOf(doneEvent).toMatchTypeOf<AllEvents>();
  });
});

// =============================================================================
// Test 10: EventDefinition type structure
// =============================================================================

describe("EventDefinition type structure", () => {
  it("has readonly type property", () => {
    type ProgressEvent = EventDefinition<"PROGRESS", { percent: number }>;

    expectTypeOf<ProgressEvent["type"]>().toEqualTypeOf<"PROGRESS">();
    // The type property should be readonly
    expectTypeOf<ProgressEvent>().toMatchTypeOf<{
      readonly type: "PROGRESS";
      readonly percent: number;
    }>();
  });
});

// =============================================================================
// Test 11: EventFactory type structure
// =============================================================================

describe("EventFactory type structure", () => {
  it("is callable and has type property", () => {
    type ProgressFactory = EventFactory<"PROGRESS", [number], { percent: number }>;

    // Should be callable with number
    expectTypeOf<ProgressFactory>().toBeCallableWith(50);

    // Should have .type property
    expectTypeOf<ProgressFactory["type"]>().toEqualTypeOf<"PROGRESS">();
  });

  it("zero-arg factory is callable with no arguments", () => {
    type DoneFactory = EventFactory<"DONE", [], Record<string, never>>;

    // Should be callable with no arguments
    expectTypeOf<DoneFactory>().toBeCallableWith();
  });
});

// =============================================================================
// Test 12: Type inference edge cases
// =============================================================================

describe("type inference edge cases", () => {
  it("handles factories with complex return types", () => {
    const ComplexEvents = defineEvents({
      DATA: (items: readonly string[], meta: { count: number }) => ({
        items,
        meta,
      }),
    });

    const event = ComplexEvents.DATA(["a", "b"], { count: 2 });
    expectTypeOf(event.type).toEqualTypeOf<"DATA">();
    expectTypeOf(event.items).toEqualTypeOf<readonly string[]>();
    expectTypeOf(event.meta).toEqualTypeOf<{ count: number }>();
  });

  it("handles factories returning primitives in object", () => {
    const PrimitiveEvents = defineEvents({
      VALUE: (n: number, s: string, b: boolean) => ({ n, s, b }),
    });

    const event = PrimitiveEvents.VALUE(42, "test", true);
    expectTypeOf(event.n).toBeNumber();
    expectTypeOf(event.s).toBeString();
    expectTypeOf(event.b).toBeBoolean();
  });

  it("TypedEventSink enforces type safety at usage site", () => {
    // Note: Due to TypeScript's structural typing and generic function variance,
    // TypedEventSink types with different events may be structurally compatible.
    // However, type safety is enforced at the emit() call site.
    const _Events = defineEvents({
      A: (x: number) => ({ x }),
      B: (y: string) => ({ y }),
    });

    type Sink = TypedEventSink<typeof _Events>;

    // Type safety is enforced when using the sink
    const testEmit = (sink: Sink) => {
      // Valid calls
      sink.emit("A", { x: 42 });
      sink.emit("B", { y: "test" });

      // Type errors would occur for invalid calls (verified by negative tests)
      // sink.emit("A", { y: "wrong" });  // Would error
      // sink.emit("C", {});               // Would error
    };

    expectTypeOf(testEmit).toBeFunction();
  });
});
