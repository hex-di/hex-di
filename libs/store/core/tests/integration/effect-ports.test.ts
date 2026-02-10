/**
 * Integration Tests: Effect Ports (ActionEffect pattern)
 *
 * Tests the effect-as-port pattern where ActionEffect adapters receive
 * ActionEvents from state services via effectAdapters configuration.
 */

import { describe, it, expect, vi } from "vitest";
import { createStateServiceImpl } from "../../src/services/state-service-impl.js";
import type { ActionEffect, ActionEvent } from "../../src/index.js";

// =============================================================================
// Test Types
// =============================================================================

interface TodoState {
  items: string[];
}

const todoActions = {
  add: (state: TodoState, item: string): TodoState => ({
    items: [...state.items, item],
  }),
  clear: (): TodoState => ({
    items: [],
  }),
};

const initialTodoState: TodoState = { items: [] };

// =============================================================================
// Action logger: effect port receives events with correct ActionEvent shape
// =============================================================================

describe("ActionEffect port receives events from state service", () => {
  it("onAction receives events with correct ActionEvent shape", () => {
    const receivedEvents: ActionEvent[] = [];
    const loggerEffect: ActionEffect = {
      onAction(event) {
        receivedEvents.push(event);
      },
    };

    const service = createStateServiceImpl({
      portName: "Todo",
      containerName: "test",
      initial: initialTodoState,
      actions: todoActions,
      effectAdapters: [loggerEffect],
    });

    service.actions.add("Buy milk");

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].portName).toBe("Todo");
    expect(receivedEvents[0].actionName).toBe("add");
    expect(receivedEvents[0].payload).toBe("Buy milk");
    expect(receivedEvents[0].phase).toBe("action");
    expect(receivedEvents[0].prevState).toEqual({ items: [] });
    expect(receivedEvents[0].nextState).toEqual({ items: ["Buy milk"] });
    expect(typeof receivedEvents[0].timestamp).toBe("number");
    expect(receivedEvents[0].error).toBeUndefined();
  });
});

// =============================================================================
// State persister: effect port receives prevState and nextState
// =============================================================================

describe("Effect port can reconstruct state changes", () => {
  it("prevState and nextState correctly reflect the transition", () => {
    const transitions: Array<{ prev: unknown; next: unknown }> = [];
    const persisterEffect: ActionEffect = {
      onAction(event) {
        transitions.push({ prev: event.prevState, next: event.nextState });
      },
    };

    const service = createStateServiceImpl({
      portName: "Todo",
      containerName: "test",
      initial: initialTodoState,
      actions: todoActions,
      effectAdapters: [persisterEffect],
    });

    service.actions.add("Item 1");
    service.actions.add("Item 2");
    service.actions.clear();

    expect(transitions).toHaveLength(3);

    // First: empty -> ["Item 1"]
    expect(transitions[0].prev).toEqual({ items: [] });
    expect(transitions[0].next).toEqual({ items: ["Item 1"] });

    // Second: ["Item 1"] -> ["Item 1", "Item 2"]
    expect(transitions[1].prev).toEqual({ items: ["Item 1"] });
    expect(transitions[1].next).toEqual({ items: ["Item 1", "Item 2"] });

    // Third: ["Item 1", "Item 2"] -> []
    expect(transitions[2].prev).toEqual({ items: ["Item 1", "Item 2"] });
    expect(transitions[2].next).toEqual({ items: [] });
  });
});

// =============================================================================
// Multiple effect adapters both receive the same action event
// =============================================================================

describe("Multiple effect adapters", () => {
  it("both adapters receive the same action event", () => {
    const eventsA: ActionEvent[] = [];
    const eventsB: ActionEvent[] = [];

    const effectA: ActionEffect = {
      onAction(event) {
        eventsA.push(event);
      },
    };

    const effectB: ActionEffect = {
      onAction(event) {
        eventsB.push(event);
      },
    };

    const service = createStateServiceImpl({
      portName: "Todo",
      containerName: "test",
      initial: initialTodoState,
      actions: todoActions,
      effectAdapters: [effectA, effectB],
    });

    service.actions.add("Test item");

    expect(eventsA).toHaveLength(1);
    expect(eventsB).toHaveLength(1);
    expect(eventsA[0].actionName).toBe("add");
    expect(eventsB[0].actionName).toBe("add");
    expect(eventsA[0].payload).toBe("Test item");
    expect(eventsB[0].payload).toBe("Test item");
  });
});

// =============================================================================
// Effect adapter error isolation
// =============================================================================

describe("Effect adapter error isolation", () => {
  it("one adapter throwing does not prevent the second from receiving the event", () => {
    const receivedEvents: ActionEvent[] = [];

    const throwingEffect: ActionEffect = {
      onAction() {
        throw new Error("Adapter A blew up");
      },
    };

    const healthyEffect: ActionEffect = {
      onAction(event) {
        receivedEvents.push(event);
      },
    };

    const onError = vi.fn();

    const service = createStateServiceImpl({
      portName: "Todo",
      containerName: "test",
      initial: initialTodoState,
      actions: todoActions,
      effectAdapters: [throwingEffect, healthyEffect],
      onError,
    });

    // Should not throw even though the first adapter throws
    service.actions.add("Resilient item");

    // The healthy adapter still received the event
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].actionName).toBe("add");

    // The error was reported via onError
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
