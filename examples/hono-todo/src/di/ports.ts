export { TodoRepositoryPort } from "../domain/ports.js";
export { AuthServicePort, LoggerPort, TodoServicePort } from "../application/ports.js";
export { RequestIdPort } from "../infrastructure/ports.js";

import { AuthServicePort, LoggerPort, TodoServicePort } from "../application/ports.js";
import { TodoRepositoryPort } from "../domain/ports.js";
import { RequestIdPort } from "../infrastructure/ports.js";

export type AppPorts =
  | typeof LoggerPort
  | typeof RequestIdPort
  | typeof AuthServicePort
  | typeof TodoRepositoryPort
  | typeof TodoServicePort;
