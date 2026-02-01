import { createAdapter } from "@hex-di/core";
import { TodoNotFoundError } from "../domain/errors.js";
import { TodoRepositoryPort } from "../domain/ports.js";
import type { Todo } from "../domain/entities.js";

export const InMemoryTodoRepositoryAdapter = createAdapter({
  provides: TodoRepositoryPort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    const store = new Map<string, Todo[]>();
    return {
      async list(userId) {
        return store.get(userId) ?? [];
      },
      async add(userId, title) {
        const todos = store.get(userId) ?? [];
        const todo: Todo = { id: crypto.randomUUID?.() ?? `${Date.now()}`, title, done: false };
        todos.push(todo);
        store.set(userId, todos);
        return todo;
      },
      async toggle(userId, id) {
        const todos = store.get(userId) ?? [];
        const todo = todos.find(item => item.id === id);
        if (!todo) {
          throw new TodoNotFoundError(id);
        }
        todo.done = !todo.done;
        return todo;
      },
    };
  },
});
