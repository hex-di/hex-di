/**
 * E2E: Todo List
 *
 * Full end-to-end tests using real GraphBuilder + createContainer.
 */

import { describe, it, expect } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createStatePort, createStateAdapter } from "../../src/index.js";

// =============================================================================
// Types
// =============================================================================

interface TodoItem {
  readonly id: number;
  readonly text: string;
  readonly done: boolean;
}

interface TodoState {
  readonly items: readonly TodoItem[];
  readonly nextId: number;
}

const todoActions = {
  add: (state: TodoState, text: string): TodoState => ({
    items: [...state.items, { id: state.nextId, text, done: false }],
    nextId: state.nextId + 1,
  }),
  toggle: (state: TodoState, id: number): TodoState => ({
    ...state,
    items: state.items.map(item => (item.id === id ? { ...item, done: !item.done } : item)),
  }),
  clearCompleted: (state: TodoState): TodoState => ({
    ...state,
    items: state.items.filter(item => !item.done),
  }),
};

type TodoActions = typeof todoActions;

// =============================================================================
// E2E Tests
// =============================================================================

describe("E2E: Todo List", () => {
  it("add items → toggle → filter → verify filtered results", async () => {
    const TodoPort = createStatePort<TodoState, TodoActions>()({
      name: "Todo",
    });
    const adapter = createStateAdapter({
      provides: TodoPort,
      initial: { items: [], nextId: 1 },
      actions: todoActions,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "e2e-todo" });

    const service = container.resolve(TodoPort);

    service.actions.add("Buy milk");
    service.actions.add("Write tests");
    service.actions.add("Deploy");

    expect(service.state.items).toHaveLength(3);
    expect(service.state.items[0]).toEqual({ id: 1, text: "Buy milk", done: false });

    service.actions.toggle(1);
    service.actions.toggle(3);

    const doneItems = service.state.items.filter(i => i.done);
    const pendingItems = service.state.items.filter(i => !i.done);

    expect(doneItems).toHaveLength(2);
    expect(pendingItems).toHaveLength(1);
    expect(pendingItems[0]?.text).toBe("Write tests");

    await container.dispose();
  });

  it("clearCompleted removes done items", async () => {
    const TodoPort = createStatePort<TodoState, TodoActions>()({
      name: "Todo",
    });
    const adapter = createStateAdapter({
      provides: TodoPort,
      initial: { items: [], nextId: 1 },
      actions: todoActions,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "e2e-todo-clear" });

    const service = container.resolve(TodoPort);

    service.actions.add("Task A");
    service.actions.add("Task B");
    service.actions.add("Task C");

    service.actions.toggle(1);
    service.actions.toggle(2);

    service.actions.clearCompleted();

    expect(service.state.items).toHaveLength(1);
    expect(service.state.items[0]?.text).toBe("Task C");
    expect(service.state.items[0]?.done).toBe(false);

    await container.dispose();
  });
});
