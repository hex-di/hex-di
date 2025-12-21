import { createPort } from "@hex-di/ports";
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

export const LoggerPort = createPort<"Logger", Logger>("Logger");
export const AuthServicePort = createPort<"AuthService", AuthService>("AuthService");
export const TodoServicePort = createPort<"TodoService", TodoService>("TodoService");
