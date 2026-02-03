import { port } from "@hex-di/core";
import type { Todo } from "./entities.js";

export interface TodoRepository {
  list(userId: string): Promise<Todo[]>;
  add(userId: string, title: string): Promise<Todo>;
  toggle(userId: string, id: string): Promise<Todo>;
}

export const TodoRepositoryPort = port<TodoRepository>()({ name: "TodoRepository" });
