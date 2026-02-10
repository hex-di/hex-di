/**
 * History Port Tests
 *
 * Tests createHistoryPort factory, createHistoryActions reducers,
 * and integration with createStateAdapter.
 */

import { describe, expect, it } from "vitest";
import {
  createStatePort,
  createHistoryPort,
  createHistoryActions,
  createStateAdapter,
} from "../src/index.js";
import type { ActionMap, HistoryState } from "../src/index.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TodoState {
  items: readonly string[];
}

interface TodoActions extends ActionMap<TodoState> {
  addItem: (state: TodoState, payload: string) => TodoState;
}

const TodoPort = createStatePort<TodoState, TodoActions>()({ name: "Todo" });

// =============================================================================
// createHistoryPort
// =============================================================================

describe("createHistoryPort", () => {
  it("creates a port with template literal name", () => {
    const HistoryPort = createHistoryPort(TodoPort);
    expect(HistoryPort.__portName).toBe("TodoHistory");
  });

  it("creates distinct ports for different inner ports", () => {
    interface CounterState {
      count: number;
    }
    interface CounterActions extends ActionMap<CounterState> {
      increment: (state: CounterState) => CounterState;
    }
    const CounterPort = createStatePort<CounterState, CounterActions>()({ name: "Counter" });

    const TodoHistory = createHistoryPort(TodoPort);
    const CounterHistory = createHistoryPort(CounterPort);

    expect(TodoHistory.__portName).toBe("TodoHistory");
    expect(CounterHistory.__portName).toBe("CounterHistory");
    expect(TodoHistory).not.toBe(CounterHistory);
  });
});

// =============================================================================
// createHistoryActions
// =============================================================================

describe("createHistoryActions", () => {
  const actions = createHistoryActions<TodoState>();
  const initial: HistoryState<TodoState> = {
    past: [],
    present: { items: [] },
    future: [],
  };

  it("returns frozen actions object", () => {
    expect(Object.isFrozen(actions)).toBe(true);
  });

  it("has all four action reducers", () => {
    expect(typeof actions.undo).toBe("function");
    expect(typeof actions.redo).toBe("function");
    expect(typeof actions.push).toBe("function");
    expect(typeof actions.clear).toBe("function");
  });

  describe("push", () => {
    it("pushes present to past and sets new present, clears future", () => {
      const newState: TodoState = { items: ["buy milk"] };
      const result = actions.push(initial, newState);

      expect(result.past).toEqual([{ items: [] }]);
      expect(result.present).toEqual({ items: ["buy milk"] });
      expect(result.future).toEqual([]);
    });

    it("clears future on push", () => {
      const stateWithFuture: HistoryState<TodoState> = {
        past: [{ items: [] }],
        present: { items: ["a"] },
        future: [{ items: ["a", "b"] }],
      };
      const newState: TodoState = { items: ["c"] };
      const result = actions.push(stateWithFuture, newState);

      expect(result.future).toEqual([]);
      expect(result.past).toEqual([{ items: [] }, { items: ["a"] }]);
      expect(result.present).toEqual({ items: ["c"] });
    });
  });

  describe("undo", () => {
    it("pops from past to present, pushes old present to future", () => {
      const state: HistoryState<TodoState> = {
        past: [{ items: [] }],
        present: { items: ["a"] },
        future: [],
      };
      const result = actions.undo(state);

      expect(result.past).toEqual([]);
      expect(result.present).toEqual({ items: [] });
      expect(result.future).toEqual([{ items: ["a"] }]);
    });

    it("returns same reference when past is empty (no-op)", () => {
      const result = actions.undo(initial);
      expect(result).toBe(initial);
    });
  });

  describe("redo", () => {
    it("shifts from future to present, pushes old present to past", () => {
      const state: HistoryState<TodoState> = {
        past: [],
        present: { items: [] },
        future: [{ items: ["a"] }, { items: ["a", "b"] }],
      };
      const result = actions.redo(state);

      expect(result.past).toEqual([{ items: [] }]);
      expect(result.present).toEqual({ items: ["a"] });
      expect(result.future).toEqual([{ items: ["a", "b"] }]);
    });

    it("returns same reference when future is empty (no-op)", () => {
      const result = actions.redo(initial);
      expect(result).toBe(initial);
    });
  });

  describe("clear", () => {
    it("empties past and future, keeps present", () => {
      const state: HistoryState<TodoState> = {
        past: [{ items: [] }, { items: ["a"] }],
        present: { items: ["a", "b"] },
        future: [{ items: ["a", "b", "c"] }],
      };
      const result = actions.clear(state);

      expect(result.past).toEqual([]);
      expect(result.present).toEqual({ items: ["a", "b"] });
      expect(result.future).toEqual([]);
    });
  });
});

// =============================================================================
// Integration with createStateAdapter
// =============================================================================

describe("history port integration with createStateAdapter", () => {
  it("works end-to-end: push → undo → redo", () => {
    const HistoryPort = createHistoryPort(TodoPort);
    const historyActions = createHistoryActions<TodoState>();

    const initialState: HistoryState<TodoState> = {
      past: [],
      present: { items: [] },
      future: [],
    };

    const adapter = createStateAdapter({
      provides: HistoryPort,
      initial: initialState,
      actions: historyActions,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "history-test" });

    const service = container.resolve(HistoryPort);

    // Initial state
    expect(service.state.present).toEqual({ items: [] });

    // Push new state
    service.actions.push({ items: ["buy milk"] });
    expect(service.state.present).toEqual({ items: ["buy milk"] });
    expect(service.state.past).toHaveLength(1);

    // Push another
    service.actions.push({ items: ["buy milk", "buy eggs"] });
    expect(service.state.present).toEqual({ items: ["buy milk", "buy eggs"] });
    expect(service.state.past).toHaveLength(2);

    // Undo
    service.actions.undo();
    expect(service.state.present).toEqual({ items: ["buy milk"] });
    expect(service.state.future).toHaveLength(1);

    // Redo
    service.actions.redo();
    expect(service.state.present).toEqual({ items: ["buy milk", "buy eggs"] });
    expect(service.state.future).toHaveLength(0);

    // Clear history
    service.actions.clear();
    expect(service.state.past).toHaveLength(0);
    expect(service.state.future).toHaveLength(0);
    expect(service.state.present).toEqual({ items: ["buy milk", "buy eggs"] });
  });
});
