import { port } from "@hex-di/core";
import type { Todo, User } from "../domain/entities.js";

export interface Logger {
  info(message: string, details?: Record<string, unknown>): void;
  error(message: string, details?: Record<string, unknown>): void;
}

export interface AuthService {
  authenticate(token: string | null | undefined): Promise<User | null>;
  requireUser(token: string | null | undefined): Promise<User>;
}

export interface TodoService {
  list(user: User): Promise<Todo[]>;
  add(user: User, title: string): Promise<Todo>;
  toggle(user: User, id: string): Promise<Todo>;
}

export const LoggerPort = port<Logger>()({ name: "Logger" });
export const AuthServicePort = port<AuthService>()({ name: "AuthService" });
export const TodoServicePort = port<TodoService>()({ name: "TodoService" });
