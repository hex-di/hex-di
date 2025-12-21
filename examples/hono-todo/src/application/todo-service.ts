import { createAdapter } from "@hex-di/graph";
import { TodoRepositoryPort } from "../domain/ports.js";
import { LoggerPort, TodoServicePort } from "./ports.js";

/**
 * Application layer service that orchestrates todo use cases.
 * Depends on domain ports (repository) and app ports (logger), no infrastructure details.
 */
export const TodoServiceAdapter = createAdapter({
  provides: TodoServicePort,
  requires: [TodoRepositoryPort, LoggerPort],
  lifetime: "scoped",
  factory: (deps) => ({
    async list(user) {
      deps.Logger.info("Listing todos", { user: user.id });
      return deps.TodoRepository.list(user.id);
    },
    async add(user, title) {
      deps.Logger.info("Creating todo", { user: user.id, title });
      return deps.TodoRepository.add(user.id, title);
    },
    async toggle(user, id) {
      deps.Logger.info("Toggling todo", { user: user.id, id });
      return deps.TodoRepository.toggle(user.id, id);
    },
  }),
});
