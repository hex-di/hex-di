/**
 * Runtime tests for defineEvents
 *
 * These tests verify:
 * 1. Factory creates events with correct `type` property
 * 2. Factory functions receive arguments correctly
 * 3. Zero-argument factories work
 * 4. Returned object is frozen
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { defineEvents } from "../../src/activities/events.js";

// =============================================================================
// Test 1: Factory creates events with correct `type` property
// =============================================================================

describe("factory creates events with correct type property", () => {
  it("should set type property to event name", () => {
    const Events = defineEvents({
      PROGRESS: (percent: number) => ({ percent }),
      COMPLETED: () => ({}),
    });

    const progressEvent = Events.PROGRESS(50);
    const completedEvent = Events.COMPLETED();

    expect(progressEvent.type).toBe("PROGRESS");
    expect(completedEvent.type).toBe("COMPLETED");
  });

  it("should set factory.type to event name", () => {
    const Events = defineEvents({
      FETCH_STARTED: () => ({}),
      FETCH_COMPLETED: (data: string) => ({ data }),
    });

    expect(Events.FETCH_STARTED.type).toBe("FETCH_STARTED");
    expect(Events.FETCH_COMPLETED.type).toBe("FETCH_COMPLETED");
  });

  it("should preserve event name in .type across multiple calls", () => {
    const Events = defineEvents({
      INCREMENT: (by: number) => ({ by }),
    });

    const event1 = Events.INCREMENT(1);
    const event2 = Events.INCREMENT(5);
    const event3 = Events.INCREMENT(10);

    expect(event1.type).toBe("INCREMENT");
    expect(event2.type).toBe("INCREMENT");
    expect(event3.type).toBe("INCREMENT");
  });
});

// =============================================================================
// Test 2: Factory functions receive arguments correctly
// =============================================================================

describe("factory functions receive arguments correctly", () => {
  it("should pass single argument to factory", () => {
    const Events = defineEvents({
      SET_VALUE: (value: number) => ({ value }),
    });

    const event = Events.SET_VALUE(42);

    expect(event.value).toBe(42);
  });

  it("should pass multiple arguments to factory", () => {
    const Events = defineEvents({
      LOGIN: (username: string, timestamp: number) => ({ username, timestamp }),
    });

    const event = Events.LOGIN("john", 1234567890);

    expect(event.username).toBe("john");
    expect(event.timestamp).toBe(1234567890);
  });

  it("should pass complex objects to factory", () => {
    interface UserData {
      id: string;
      name: string;
    }

    const Events = defineEvents({
      USER_CREATED: (user: UserData, verified: boolean) => ({ user, verified }),
    });

    const userData: UserData = { id: "123", name: "Alice" };
    const event = Events.USER_CREATED(userData, true);

    expect(event.user).toEqual({ id: "123", name: "Alice" });
    expect(event.verified).toBe(true);
  });

  it("should handle array arguments", () => {
    const Events = defineEvents({
      ITEMS_LOADED: (items: readonly string[]) => ({ items, count: items.length }),
    });

    const event = Events.ITEMS_LOADED(["a", "b", "c"]);

    expect(event.items).toEqual(["a", "b", "c"]);
    expect(event.count).toBe(3);
  });
});

// =============================================================================
// Test 3: Zero-argument factories work
// =============================================================================

describe("zero-argument factories work", () => {
  it("should create event with only type property", () => {
    const Events = defineEvents({
      RESET: () => ({}),
    });

    const event = Events.RESET();

    expect(event.type).toBe("RESET");
    expect(Object.keys(event)).toEqual(["type"]);
  });

  it("should work with multiple zero-argument factories", () => {
    const Events = defineEvents({
      START: () => ({}),
      PAUSE: () => ({}),
      STOP: () => ({}),
    });

    expect(Events.START().type).toBe("START");
    expect(Events.PAUSE().type).toBe("PAUSE");
    expect(Events.STOP().type).toBe("STOP");
  });

  it("should mix zero-arg and multi-arg factories", () => {
    const Events = defineEvents({
      BEGIN: () => ({}),
      PROGRESS: (percent: number) => ({ percent }),
      ERROR: (message: string, code: number) => ({ message, code }),
      END: () => ({}),
    });

    const beginEvent = Events.BEGIN();
    const progressEvent = Events.PROGRESS(75);
    const errorEvent = Events.ERROR("Failed", 500);
    const endEvent = Events.END();

    expect(beginEvent.type).toBe("BEGIN");
    expect(Object.keys(beginEvent)).toEqual(["type"]);

    expect(progressEvent.type).toBe("PROGRESS");
    expect(progressEvent.percent).toBe(75);

    expect(errorEvent.type).toBe("ERROR");
    expect(errorEvent.message).toBe("Failed");
    expect(errorEvent.code).toBe(500);

    expect(endEvent.type).toBe("END");
    expect(Object.keys(endEvent)).toEqual(["type"]);
  });
});

// =============================================================================
// Test 4: Returned object is frozen
// =============================================================================

describe("returned object is frozen", () => {
  it("should freeze event objects", () => {
    const Events = defineEvents({
      DATA: (value: number) => ({ value }),
    });

    const event = Events.DATA(100);

    expect(Object.isFrozen(event)).toBe(true);
  });

  it("should freeze zero-payload event objects", () => {
    const Events = defineEvents({
      DONE: () => ({}),
    });

    const event = Events.DONE();

    expect(Object.isFrozen(event)).toBe(true);
  });

  it("should freeze the events definition object", () => {
    const Events = defineEvents({
      A: () => ({}),
      B: (x: number) => ({ x }),
    });

    expect(Object.isFrozen(Events)).toBe(true);
  });

  it("should not allow modification of event type", () => {
    const Events = defineEvents({
      TEST: () => ({}),
    });

    const event = Events.TEST();

    // Attempting to modify should throw in strict mode or fail silently
    expect(() => {
      // @ts-expect-error - attempting to modify frozen object
      event.type = "MODIFIED";
    }).toThrow();

    expect(event.type).toBe("TEST");
  });

  it("should not allow modification of event payload", () => {
    const Events = defineEvents({
      VALUE: (n: number) => ({ n }),
    });

    const event = Events.VALUE(42);

    expect(() => {
      // @ts-expect-error - attempting to modify frozen object
      event.n = 999;
    }).toThrow();

    expect(event.n).toBe(42);
  });

  it("should not allow adding properties to event", () => {
    const Events = defineEvents({
      SIMPLE: () => ({}),
    });

    const event = Events.SIMPLE();

    expect(() => {
      // @ts-expect-error - attempting to add property to frozen object
      event.extra = "value";
    }).toThrow();
  });

  it("should not allow modification of factory.type", () => {
    const Events = defineEvents({
      TEST: () => ({}),
    });

    expect(() => {
      // @ts-expect-error - attempting to modify readonly property
      Events.TEST.type = "MODIFIED";
    }).toThrow();

    expect(Events.TEST.type).toBe("TEST");
  });
});

// =============================================================================
// Test 5: Event object structure
// =============================================================================

describe("event object structure", () => {
  it("should spread payload properties into event", () => {
    const Events = defineEvents({
      MULTI: (a: string, b: number, c: boolean) => ({ a, b, c }),
    });

    const event = Events.MULTI("test", 123, true);

    expect(event).toEqual({
      type: "MULTI",
      a: "test",
      b: 123,
      c: true,
    });
  });

  it("should include type first in object keys", () => {
    const Events = defineEvents({
      DATA: (x: number) => ({ x }),
    });

    const event = Events.DATA(1);
    const keys = Object.keys(event);

    expect(keys[0]).toBe("type");
  });

  it("should handle nested object payloads", () => {
    const Events = defineEvents({
      NESTED: (data: { inner: { value: number } }) => ({ data }),
    });

    const event = Events.NESTED({ inner: { value: 42 } });

    expect(event.type).toBe("NESTED");
    expect(event.data.inner.value).toBe(42);
  });

  it("should handle null values in payload", () => {
    const Events = defineEvents({
      NULLABLE: (value: string | null) => ({ value }),
    });

    const eventWithNull = Events.NULLABLE(null);
    const eventWithValue = Events.NULLABLE("test");

    expect(eventWithNull.value).toBeNull();
    expect(eventWithValue.value).toBe("test");
  });

  it("should handle undefined values in payload", () => {
    const Events = defineEvents({
      OPTIONAL: (value: string | undefined) => ({ value }),
    });

    const eventWithUndefined = Events.OPTIONAL(undefined);
    const eventWithValue = Events.OPTIONAL("test");

    expect(eventWithUndefined.value).toBeUndefined();
    expect(eventWithValue.value).toBe("test");
  });
});

// =============================================================================
// Test 6: Factory independence
// =============================================================================

describe("factory independence", () => {
  it("should create independent event instances", () => {
    const Events = defineEvents({
      COUNTER: (count: number) => ({ count }),
    });

    const event1 = Events.COUNTER(1);
    const event2 = Events.COUNTER(2);

    expect(event1.count).toBe(1);
    expect(event2.count).toBe(2);
    expect(event1).not.toBe(event2);
  });

  it("should not share state between factories", () => {
    const Events = defineEvents({
      A: (x: number) => ({ x }),
      B: (y: string) => ({ y }),
    });

    const eventA = Events.A(10);
    const eventB = Events.B("hello");

    expect(eventA.type).toBe("A");
    expect(eventB.type).toBe("B");
    expect("y" in eventA).toBe(false);
    expect("x" in eventB).toBe(false);
  });
});
