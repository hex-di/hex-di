import { createPort } from "@hex-di/ports";
import type { Todo } from "./entities.js";

export interface TodoRepository {
  list(userId: string): Promise<Todo[]>;
  add(userId: string, title: string): Promise<Todo>;
  toggle(userId: string, id: string): Promise<Todo>;
}

export const TodoRepositoryPort = createPort<"TodoRepository", TodoRepository>("TodoRepository");
