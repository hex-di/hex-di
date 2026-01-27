import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { TodoServiceAdapter } from "../application/todo-service.js";
import { AuthAdapter } from "../infrastructure/auth.js";
import { LoggerAdapter } from "../infrastructure/logger.js";
import { RequestIdAdapter } from "../infrastructure/request-id.js";
import { InMemoryTodoRepositoryAdapter } from "../infrastructure/todo-repo-memory.js";

export function createAppContainer() {
  const graph = GraphBuilder.create()
    .provide(RequestIdAdapter)
    .provide(LoggerAdapter)
    .provide(AuthAdapter)
    .provide(InMemoryTodoRepositoryAdapter)
    .provide(TodoServiceAdapter)
    .build();

  return createContainer(graph, { name: "HonoTodoApp" });
}

export type AppContainer = ReturnType<typeof createAppContainer>;
export type AppScope = AppContainer extends { createScope: () => infer S } ? S : never;
